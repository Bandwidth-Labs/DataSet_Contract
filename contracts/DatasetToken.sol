// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title DatasetToken
 * @dev ERC721 contract for dataset ownership and access tokens
 * @notice This contract manages both permanent ownership tokens and temporary access tokens
 */
contract DatasetToken is ERC721, ERC721URIStorage, AccessControl, Pausable, ReentrancyGuard {
    // Role definitions
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    // Token type enumeration
    enum TokenType {
        OWNERSHIP,  // Permanent ownership token
        ACCESS      // Temporary access token
    }

    // Token information structure
    struct TokenInfo {
        uint256 datasetId;
        TokenType tokenType;
        uint256 expiryTime;    // 0 for ownership tokens, timestamp for access tokens
        bool transferable;     // true for ownership, false for access tokens
        address originalOwner; // For access tokens, tracks who granted access
    }

    // State variables
    uint256 private _tokenIdCounter;
    mapping(uint256 => TokenInfo) public tokenInfo;
    mapping(uint256 => uint256[]) public datasetTokens; // datasetId => tokenIds[]
    mapping(address => uint256[]) public userTokens;    // user => tokenIds[]

    // Events
    event DatasetTokenMinted(
        uint256 indexed tokenId,
        uint256 indexed datasetId,
        address indexed owner,
        TokenType tokenType,
        string metadataURI
    );

    event AccessTokenMinted(
        uint256 indexed tokenId,
        uint256 indexed datasetId,
        address indexed buyer,
        address originalOwner,
        uint256 expiryTime
    );

    event TokenBurned(uint256 indexed tokenId, uint256 indexed datasetId);

    event TokenTransferabilityUpdated(uint256 indexed tokenId, bool transferable);

    /**
     * @dev Constructor
     * @param initialOwner Address that will be granted DEFAULT_ADMIN_ROLE
     */
    constructor(address initialOwner) ERC721("Dataset Marketplace Token", "DMT") {
        _grantRole(DEFAULT_ADMIN_ROLE, initialOwner);
        _grantRole(MINTER_ROLE, initialOwner);
        _grantRole(PAUSER_ROLE, initialOwner);
        _grantRole(BURNER_ROLE, initialOwner);
        _tokenIdCounter = 1; // Start from 1
    }

    /**
     * @dev Mint a dataset ownership token
     * @param to Address to mint the token to
     * @param datasetId Unique identifier for the dataset
     * @param metadataURI IPFS URI containing dataset metadata
     * @return tokenId The minted token ID
     */
    function mintDatasetToken(
        address to,
        uint256 datasetId,
        string memory metadataURI
    ) public onlyRole(MINTER_ROLE) whenNotPaused returns (uint256) {
        uint256 tokenId = _tokenIdCounter++;
        
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, metadataURI);

        tokenInfo[tokenId] = TokenInfo({
            datasetId: datasetId,
            tokenType: TokenType.OWNERSHIP,
            expiryTime: 0,
            transferable: true,
            originalOwner: to
        });

        datasetTokens[datasetId].push(tokenId);
        userTokens[to].push(tokenId);

        emit DatasetTokenMinted(tokenId, datasetId, to, TokenType.OWNERSHIP, metadataURI);
        return tokenId;
    }

    /**
     * @dev Mint a temporary access token
     * @param to Address to mint the access token to
     * @param datasetId Dataset ID for access
     * @param expiryTime When the access expires (timestamp)
     * @param originalOwner Address of the dataset owner
     * @param metadataURI IPFS URI for access token metadata
     * @return tokenId The minted access token ID
     */
    function mintAccessToken(
        address to,
        uint256 datasetId,
        uint256 expiryTime,
        address originalOwner,
        string memory metadataURI
    ) public onlyRole(MINTER_ROLE) whenNotPaused returns (uint256) {
        require(expiryTime > block.timestamp, "Expiry time must be in the future");
        require(to != originalOwner, "Cannot mint access token to dataset owner");

        uint256 tokenId = _tokenIdCounter++;
        
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, metadataURI);

        tokenInfo[tokenId] = TokenInfo({
            datasetId: datasetId,
            tokenType: TokenType.ACCESS,
            expiryTime: expiryTime,
            transferable: false,
            originalOwner: originalOwner
        });

        datasetTokens[datasetId].push(tokenId);
        userTokens[to].push(tokenId);

        emit AccessTokenMinted(tokenId, datasetId, to, originalOwner, expiryTime);
        return tokenId;
    }

    /**
     * @dev Check if a token provides valid access to a dataset
     * @param tokenId Token ID to check
     * @return bool True if token provides valid access
     */
    function hasValidAccess(uint256 tokenId) public view returns (bool) {
        if (_ownerOf(tokenId) == address(0)) {
            return false;
        }

        TokenInfo memory info = tokenInfo[tokenId];
        
        // Ownership tokens always provide access
        if (info.tokenType == TokenType.OWNERSHIP) {
            return true;
        }
        
        // Access tokens must not be expired
        return info.expiryTime > block.timestamp;
    }

    /**
     * @dev Get detailed information about a token's access
     * @param tokenId Token ID to query
     * @return datasetId Dataset ID
     * @return tokenType Type of token (ownership or access)
     * @return expiryTime Expiry timestamp (0 for ownership tokens)
     * @return isValid Whether the token currently provides valid access
     */
    function getAccessDetails(uint256 tokenId) 
        public 
        view 
        returns (uint256 datasetId, TokenType tokenType, uint256 expiryTime, bool isValid) 
    {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        
        TokenInfo memory info = tokenInfo[tokenId];
        return (
            info.datasetId,
            info.tokenType,
            info.expiryTime,
            hasValidAccess(tokenId)
        );
    }

    /**
     * @dev Burn an expired access token
     * @param tokenId Token ID to burn
     */
    function burnExpiredToken(uint256 tokenId) public {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");        
        TokenInfo memory info = tokenInfo[tokenId];
        require(info.tokenType == TokenType.ACCESS, "Can only burn access tokens");
        require(info.expiryTime <= block.timestamp, "Token not yet expired");
        
        // Allow owner, original owner, or burner role to burn expired tokens
        require(
            ownerOf(tokenId) == msg.sender || 
            info.originalOwner == msg.sender || 
            hasRole(BURNER_ROLE, msg.sender),
            "Not authorized to burn this token"
        );

        _burnToken(tokenId);
    }

    /**
     * @dev Force burn a token (admin only)
     * @param tokenId Token ID to burn
     */
    function forceBurn(uint256 tokenId) public onlyRole(BURNER_ROLE) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        _burnToken(tokenId);
    }

    /**
     * @dev Internal function to burn a token and clean up state
     * @param tokenId Token ID to burn
     */
    function _burnToken(uint256 tokenId) internal {
        TokenInfo memory info = tokenInfo[tokenId];
        address owner = ownerOf(tokenId);
        
        // Remove from user tokens array
        _removeFromArray(userTokens[owner], tokenId);
        
        // Remove from dataset tokens array
        _removeFromArray(datasetTokens[info.datasetId], tokenId);
        
        // Clean up token info
        delete tokenInfo[tokenId];
        
        // Burn the token
        _burn(tokenId);
        
        emit TokenBurned(tokenId, info.datasetId);
    }

    /**
     * @dev Remove a value from an array
     * @param array The array to modify
     * @param value The value to remove
     */
    function _removeFromArray(uint256[] storage array, uint256 value) internal {
        for (uint256 i = 0; i < array.length; i++) {
            if (array[i] == value) {
                array[i] = array[array.length - 1];
                array.pop();
                break;
            }
        }
    }

    /**
     * @dev Set token transferability (admin only)
     * @param tokenId Token ID
     * @param transferable New transferability status
     */
    function setTokenTransferability(uint256 tokenId, bool transferable) 
        public 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        tokenInfo[tokenId].transferable = transferable;
        emit TokenTransferabilityUpdated(tokenId, transferable);
    }

    /**
     * @dev Get all tokens owned by a user
     * @param user User address
     * @return Array of token IDs
     */
    function getUserTokens(address user) public view returns (uint256[] memory) {
        return userTokens[user];
    }

    /**
     * @dev Get all tokens for a specific dataset
     * @param datasetId Dataset ID
     * @return Array of token IDs
     */
    function getDatasetTokens(uint256 datasetId) public view returns (uint256[] memory) {
        return datasetTokens[datasetId];
    }

    /**
     * @dev Get the current token counter value
     * @return Current token counter
     */
    function getCurrentTokenId() public view returns (uint256) {
        return _tokenIdCounter;
    }

    /**
     * @dev Override _update to implement transferability checks and pause functionality
     * This replaces the old _beforeTokenTransfer and _afterTokenTransfer hooks
     */
    function _update(address to, uint256 tokenId, address auth)
        internal
        override
        whenNotPaused
        returns (address)
    {
        address from = _ownerOf(tokenId);

        // Check transferability for existing tokens (not minting or burning)
        if (from != address(0) && to != address(0)) {
            require(tokenInfo[tokenId].transferable, "Token is not transferable");
        }

        // Perform the transfer
        address previousOwner = super._update(to, tokenId, auth);

        // Update user token arrays for transfers (not mints/burns)
        if (from != address(0) && to != address(0)) {
            _removeFromArray(userTokens[from], tokenId);
            userTokens[to].push(tokenId);
        }

        return previousOwner;
    }

    /**
     * @dev Pause the contract (admin only)
     */
    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /**
     * @dev Unpause the contract (admin only)
     */
    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    // Required overrides for multiple inheritance
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}