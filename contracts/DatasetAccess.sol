// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./DatasetToken.sol";

/**
 * @title DatasetAccess
 * @dev Main marketplace contract for dataset access management and monetization
 * @notice Handles dataset creation, access purchases, and payment distribution
 */
contract DatasetAccess is Ownable, Pausable, ReentrancyGuard {
    // Constants
    uint256 public constant MAX_ROYALTY_PERCENTAGE = 1000; // 10% max royalty
    uint256 public constant BASIS_POINTS = 10000; // 100% = 10000 basis points
    uint256 public constant MAX_ROYALTY_RECIPIENTS = 10;

    // Dataset access duration options
    enum AccessDuration {
        HOUR_1,     // 1 hour
        HOURS_24,   // 24 hours
        DAYS_7,     // 7 days
        DAYS_30,    // 30 days
        DAYS_90,    // 90 days
        DAYS_365    // 365 days
    }

    // Dataset information structure
    struct Dataset {
        uint256 id;
        address owner;
        string metadataURI;
        bool isActive;
        uint256 createdAt;
        uint256 totalSales;
        uint256 totalRevenue;
        mapping(AccessDuration => uint256) prices; // Duration => Price in wei
    }

    // Royalty recipient structure
    struct RoyaltyRecipient {
        address recipient;
        uint256 percentage; // In basis points (1% = 100)
    }

    // Access purchase structure
    struct AccessPurchase {
        uint256 datasetId;
        address buyer;
        AccessDuration duration;
        uint256 price;
        uint256 purchaseTime;
        uint256 expiryTime;
        uint256 tokenId;
    }

    // State variables
    DatasetToken public immutable datasetToken;
    address public platformWallet;
    uint256 public platformFeePercentage; // In basis points
    uint256 private _datasetIdCounter;

    // Mappings
    mapping(uint256 => Dataset) public datasets;
    mapping(uint256 => RoyaltyRecipient[]) public datasetRoyalties;
    mapping(address => uint256[]) public userDatasets;
    mapping(address => uint256[]) public userPurchases;
    mapping(uint256 => AccessPurchase) public purchases;
    mapping(address => mapping(uint256 => bool)) public userAccess; // user => datasetId => hasAccess

    // Events
    event DatasetCreated(
        uint256 indexed datasetId,
        address indexed owner,
        string metadataURI,
        uint256 timestamp
    );

    event DatasetUpdated(
        uint256 indexed datasetId,
        string newMetadataURI,
        uint256 timestamp
    );

    event PriceUpdated(
        uint256 indexed datasetId,
        AccessDuration duration,
        uint256 oldPrice,
        uint256 newPrice
    );

    event AccessPurchased(
        uint256 indexed purchaseId,
        uint256 indexed datasetId,
        address indexed buyer,
        AccessDuration duration,
        uint256 price,
        uint256 expiryTime,
        uint256 tokenId
    );

    event AccessRevoked(
        uint256 indexed datasetId,
        address indexed user,
        uint256 tokenId
    );

    event RoyaltySet(
        uint256 indexed datasetId,
        address indexed recipient,
        uint256 percentage
    );

    event PaymentDistributed(
        uint256 indexed datasetId,
        uint256 totalAmount,
        uint256 ownerAmount,
        uint256 platformAmount,
        uint256 royaltyAmount
    );

    event DatasetToggled(uint256 indexed datasetId, bool isActive);

    event PlatformFeeUpdated(uint256 oldFee, uint256 newFee);

    event PlatformWalletUpdated(address oldWallet, address newWallet);

    /**
     * @dev Constructor
     * @param _datasetToken Address of the DatasetToken contract
     * @param _platformWallet Address to receive platform fees
     * @param _platformFeePercentage Platform fee in basis points
     * @param _initialOwner Initial owner of the contract
     */
    constructor(
        address _datasetToken,
        address _platformWallet,
        uint256 _platformFeePercentage,
        address _initialOwner
    ) Ownable(_initialOwner) {
        require(_datasetToken != address(0), "Invalid token contract address");
        require(_platformWallet != address(0), "Invalid platform wallet");
        require(_platformFeePercentage <= 1000, "Platform fee too high"); // Max 10%

        datasetToken = DatasetToken(_datasetToken);
        platformWallet = _platformWallet;
        platformFeePercentage = _platformFeePercentage;
        _datasetIdCounter = 1;
    }

    /**
     * @dev Create a new dataset
     * @param metadataURI IPFS URI containing dataset metadata
     * @param prices Array of prices for each access duration
     * @return datasetId The created dataset ID
     */
    function createDataset(
        string memory metadataURI,
        uint256[6] memory prices
    ) public whenNotPaused returns (uint256) {
        require(bytes(metadataURI).length > 0, "Metadata URI cannot be empty");

        uint256 datasetId = _datasetIdCounter++;
        
        Dataset storage newDataset = datasets[datasetId];
        newDataset.id = datasetId;
        newDataset.owner = msg.sender;
        newDataset.metadataURI = metadataURI;
        newDataset.isActive = true;
        newDataset.createdAt = block.timestamp;
        newDataset.totalSales = 0;
        newDataset.totalRevenue = 0;

        // Set prices for all durations
        for (uint256 i = 0; i < 6; i++) {
            newDataset.prices[AccessDuration(i)] = prices[i];
        }

        userDatasets[msg.sender].push(datasetId);

        // Mint ownership NFT
        datasetToken.mintDatasetToken(msg.sender, datasetId, metadataURI);

        emit DatasetCreated(datasetId, msg.sender, metadataURI, block.timestamp);
        return datasetId;
    }

    /**
     * @dev Update dataset metadata and pricing
     * @param datasetId Dataset ID to update
     * @param newMetadataURI New metadata URI
     * @param newPrices New prices array
     */
    function updateDataset(
        uint256 datasetId,
        string memory newMetadataURI,
        uint256[6] memory newPrices
    ) public {
        require(_datasetExists(datasetId), "Dataset does not exist");
        require(datasets[datasetId].owner == msg.sender, "Not dataset owner");
        require(bytes(newMetadataURI).length > 0, "Metadata URI cannot be empty");

        Dataset storage dataset = datasets[datasetId];
        
        // Update metadata
        dataset.metadataURI = newMetadataURI;

        // Update prices and emit events
        for (uint256 i = 0; i < 6; i++) {
            AccessDuration duration = AccessDuration(i);
            uint256 oldPrice = dataset.prices[duration];
            dataset.prices[duration] = newPrices[i];
            
            if (oldPrice != newPrices[i]) {
                emit PriceUpdated(datasetId, duration, oldPrice, newPrices[i]);
            }
        }

        emit DatasetUpdated(datasetId, newMetadataURI, block.timestamp);
    }

    /**
     * @dev Purchase access to a dataset
     * @param datasetId Dataset ID to purchase access for
     * @param duration Access duration
     * @return purchaseId The purchase ID
     */
    function purchaseAccess(
        uint256 datasetId,
        AccessDuration duration
    ) public payable whenNotPaused nonReentrant returns (uint256) {
        require(_datasetExists(datasetId), "Dataset does not exist");
        require(datasets[datasetId].isActive, "Dataset is not active");
        
        Dataset storage dataset = datasets[datasetId];
        require(dataset.owner != msg.sender, "Cannot purchase own dataset");
        
        uint256 price = dataset.prices[duration];
        require(price > 0, "Price not set for this duration");
        require(msg.value >= price, "Insufficient payment");

        // Calculate access duration in seconds
        uint256 durationSeconds = _getDurationInSeconds(duration);
        uint256 expiryTime = block.timestamp + durationSeconds;

        // Create purchase record
        uint256 purchaseId = userPurchases[msg.sender].length;
        AccessPurchase storage purchase = purchases[purchaseId];
        purchase.datasetId = datasetId;
        purchase.buyer = msg.sender;
        purchase.duration = duration;
        purchase.price = price;
        purchase.purchaseTime = block.timestamp;
        purchase.expiryTime = expiryTime;

        // Mint access token
        string memory accessTokenURI = string(abi.encodePacked(
            dataset.metadataURI,
            "/access/",
            _toString(purchaseId)
        ));
        
        uint256 tokenId = datasetToken.mintAccessToken(
            msg.sender,
            datasetId,
            expiryTime,
            dataset.owner,
            accessTokenURI
        );
        
        purchase.tokenId = tokenId;
        userPurchases[msg.sender].push(purchaseId);
        userAccess[msg.sender][datasetId] = true;

        // Update dataset statistics
        dataset.totalSales++;
        dataset.totalRevenue += price;

        // Distribute payment
        _distributePayment(datasetId, price);

        // Refund excess payment
        if (msg.value > price) {
            payable(msg.sender).transfer(msg.value - price);
        }

        emit AccessPurchased(
            purchaseId,
            datasetId,
            msg.sender,
            duration,
            price,
            expiryTime,
            tokenId
        );

        return purchaseId;
    }

    /**
     * @dev Check if a user has valid access to a dataset
     * @param user User address
     * @param datasetId Dataset ID
     * @return hasAccess Whether user has valid access
     */
    function checkAccess(address user, uint256 datasetId) public view returns (bool) {
        require(_datasetExists(datasetId), "Dataset does not exist");
        
        // Dataset owner always has access
        if (datasets[datasetId].owner == user) {
            return true;
        }

        // Check if user has any valid access tokens for this dataset
        uint256[] memory userTokens = datasetToken.getUserTokens(user);
        for (uint256 i = 0; i < userTokens.length; i++) {
            (uint256 tokenDatasetId, , , bool isValid) = datasetToken.getAccessDetails(userTokens[i]);
            if (tokenDatasetId == datasetId && isValid) {
                return true;
            }
        }

        return false;
    }

    /**
     * @dev Get detailed access information for a user and dataset
     * @param user User address
     * @param datasetId Dataset ID
     * @return hasAccess Whether user has access
     * @return expiryTime When access expires (0 if owner or no access)
     * @return tokenId Access token ID (0 if owner or no access)
     */
    function getAccessDetails(address user, uint256 datasetId) 
        public 
        view 
        returns (bool hasAccess, uint256 expiryTime, uint256 tokenId) 
    {
        require(_datasetExists(datasetId), "Dataset does not exist");
        
        // Dataset owner always has access
        if (datasets[datasetId].owner == user) {
            return (true, 0, 0);
        }

        // Find the most recent valid access token
        uint256[] memory userTokens = datasetToken.getUserTokens(user);
        uint256 latestExpiry = 0;
        uint256 latestTokenId = 0;
        
        for (uint256 i = 0; i < userTokens.length; i++) {
            (uint256 tokenDatasetId, , uint256 tokenExpiry, bool isValid) = 
                datasetToken.getAccessDetails(userTokens[i]);
            
            if (tokenDatasetId == datasetId && isValid && tokenExpiry > latestExpiry) {
                latestExpiry = tokenExpiry;
                latestTokenId = userTokens[i];
            }
        }

        return (latestTokenId > 0, latestExpiry, latestTokenId);
    }

    /**
     * @dev Revoke access for a user (owner or platform only)
     * @param datasetId Dataset ID
     * @param user User to revoke access for
     */
    function revokeAccess(uint256 datasetId, address user) public {
        require(_datasetExists(datasetId), "Dataset does not exist");
        require(
            datasets[datasetId].owner == msg.sender || owner() == msg.sender,
            "Not authorized to revoke access"
        );

        // Find and burn user's access tokens for this dataset
        uint256[] memory userTokens = datasetToken.getUserTokens(user);
        for (uint256 i = 0; i < userTokens.length; i++) {
            (uint256 tokenDatasetId, DatasetToken.TokenType tokenType, , ) = 
                datasetToken.getAccessDetails(userTokens[i]);
            
            if (tokenDatasetId == datasetId && tokenType == DatasetToken.TokenType.ACCESS) {
                datasetToken.forceBurn(userTokens[i]);
                emit AccessRevoked(datasetId, user, userTokens[i]);
            }
        }

        userAccess[user][datasetId] = false;
    }

    /**
     * @dev Set royalty recipients for a dataset
     * @param datasetId Dataset ID
     * @param recipients Array of royalty recipients
     * @param percentages Array of percentages (in basis points)
     */
    function setRoyalty(
        uint256 datasetId,
        address[] memory recipients,
        uint256[] memory percentages
    ) public {
        require(_datasetExists(datasetId), "Dataset does not exist");
        require(datasets[datasetId].owner == msg.sender, "Not dataset owner");
        require(recipients.length == percentages.length, "Arrays length mismatch");
        require(recipients.length <= MAX_ROYALTY_RECIPIENTS, "Too many recipients");

        // Clear existing royalties
        delete datasetRoyalties[datasetId];

        uint256 totalPercentage = 0;
        for (uint256 i = 0; i < recipients.length; i++) {
            require(recipients[i] != address(0), "Invalid recipient address");
            require(percentages[i] > 0, "Percentage must be greater than 0");
            
            totalPercentage += percentages[i];
            
            datasetRoyalties[datasetId].push(RoyaltyRecipient({
                recipient: recipients[i],
                percentage: percentages[i]
            }));

            emit RoyaltySet(datasetId, recipients[i], percentages[i]);
        }

        require(totalPercentage <= MAX_ROYALTY_PERCENTAGE, "Total royalty exceeds maximum");
    }

    /**
     * @dev Get dataset information
     * @param datasetId Dataset ID
     * @return id Dataset ID
     * @return owner Dataset owner address
     * @return metadataURI Dataset metadata URI
     * @return isActive Whether dataset is active
     * @return createdAt Creation timestamp
     * @return totalSales Total number of sales
     * @return totalRevenue Total revenue earned
     * @return prices Array of prices for each duration
     */
    function getDataset(uint256 datasetId) public view returns (
        uint256 id,
        address owner,
        string memory metadataURI,
        bool isActive,
        uint256 createdAt,
        uint256 totalSales,
        uint256 totalRevenue,
        uint256[6] memory prices
    ) {
        require(_datasetExists(datasetId), "Dataset does not exist");
        
        Dataset storage dataset = datasets[datasetId];
        
        uint256[6] memory datasetPrices;
        for (uint256 i = 0; i < 6; i++) {
            datasetPrices[i] = dataset.prices[AccessDuration(i)];
        }

        return (
            dataset.id,
            dataset.owner,
            dataset.metadataURI,
            dataset.isActive,
            dataset.createdAt,
            dataset.totalSales,
            dataset.totalRevenue,
            datasetPrices
        );
    }

    /**
     * @dev Get royalty recipients for a dataset
     * @param datasetId Dataset ID
     * @return recipients Array of recipient addresses
     * @return percentages Array of percentages
     */
    function getRoyalties(uint256 datasetId) public view returns (
        address[] memory recipients,
        uint256[] memory percentages
    ) {
        require(_datasetExists(datasetId), "Dataset does not exist");
        
        RoyaltyRecipient[] storage royalties = datasetRoyalties[datasetId];
        recipients = new address[](royalties.length);
        percentages = new uint256[](royalties.length);
        
        for (uint256 i = 0; i < royalties.length; i++) {
            recipients[i] = royalties[i].recipient;
            percentages[i] = royalties[i].percentage;
        }
    }

    /**
     * @dev Get user's datasets
     * @param user User address
     * @return Array of dataset IDs
     */
    function getUserDatasets(address user) public view returns (uint256[] memory) {
        return userDatasets[user];
    }

    /**
     * @dev Get user's purchases
     * @param user User address
     * @return Array of purchase IDs
     */
    function getUserPurchases(address user) public view returns (uint256[] memory) {
        return userPurchases[user];
    }

    /**
     * @dev Emergency toggle dataset active status (owner only)
     * @param datasetId Dataset ID
     */
    function emergencyToggleDataset(uint256 datasetId) public onlyOwner {
        require(_datasetExists(datasetId), "Dataset does not exist");
        datasets[datasetId].isActive = !datasets[datasetId].isActive;
        emit DatasetToggled(datasetId, datasets[datasetId].isActive);
    }

    /**
     * @dev Update platform fee (owner only)
     * @param newFeePercentage New fee percentage in basis points
     */
    function updatePlatformFee(uint256 newFeePercentage) public onlyOwner {
        require(newFeePercentage <= 1000, "Fee too high"); // Max 10%
        uint256 oldFee = platformFeePercentage;
        platformFeePercentage = newFeePercentage;
        emit PlatformFeeUpdated(oldFee, newFeePercentage);
    }

    /**
     * @dev Update platform wallet (owner only)
     * @param newPlatformWallet New platform wallet address
     */
    function updatePlatformWallet(address newPlatformWallet) public onlyOwner {
        require(newPlatformWallet != address(0), "Invalid address");
        address oldWallet = platformWallet;
        platformWallet = newPlatformWallet;
        emit PlatformWalletUpdated(oldWallet, newPlatformWallet);
    }

    /**
     * @dev Emergency withdraw (owner only)
     */
    function emergencyWithdraw() public onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        payable(owner()).transfer(balance);
    }

    /**
     * @dev Pause the contract (owner only)
     */
    function pause() public onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause the contract (owner only)
     */
    function unpause() public onlyOwner {
        _unpause();
    }

    // Internal functions

    /**
     * @dev Check if dataset exists
     * @param datasetId Dataset ID to check
     * @return bool Whether dataset exists
     */
    function _datasetExists(uint256 datasetId) internal view returns (bool) {
        return datasetId > 0 && datasetId < _datasetIdCounter;
    }

    /**
     * @dev Get duration in seconds for AccessDuration enum
     * @param duration AccessDuration enum value
     * @return uint256 Duration in seconds
     */
    function _getDurationInSeconds(AccessDuration duration) internal pure returns (uint256) {
        if (duration == AccessDuration.HOUR_1) return 1 hours;
        if (duration == AccessDuration.HOURS_24) return 24 hours;
        if (duration == AccessDuration.DAYS_7) return 7 days;
        if (duration == AccessDuration.DAYS_30) return 30 days;
        if (duration == AccessDuration.DAYS_90) return 90 days;
        if (duration == AccessDuration.DAYS_365) return 365 days;
        revert("Invalid duration");
    }

    /**
     * @dev Distribute payment among owner, platform, and royalty recipients
     * @param datasetId Dataset ID
     * @param totalAmount Total payment amount
     */
    function _distributePayment(uint256 datasetId, uint256 totalAmount) internal {
        Dataset storage dataset = datasets[datasetId];
        RoyaltyRecipient[] storage royalties = datasetRoyalties[datasetId];

        // Calculate platform fee
        uint256 platformAmount = (totalAmount * platformFeePercentage) / BASIS_POINTS;
        
        // Calculate total royalty amount
        uint256 totalRoyaltyAmount = 0;
        for (uint256 i = 0; i < royalties.length; i++) {
            uint256 royaltyAmount = (totalAmount * royalties[i].percentage) / BASIS_POINTS;
            totalRoyaltyAmount += royaltyAmount;
            
            if (royaltyAmount > 0) {
                payable(royalties[i].recipient).transfer(royaltyAmount);
            }
        }

        // Owner gets the remaining amount
        uint256 ownerAmount = totalAmount - platformAmount - totalRoyaltyAmount;

        // Transfer payments
        if (platformAmount > 0) {
            payable(platformWallet).transfer(platformAmount);
        }
        
        if (ownerAmount > 0) {
            payable(dataset.owner).transfer(ownerAmount);
        }

        emit PaymentDistributed(datasetId, totalAmount, ownerAmount, platformAmount, totalRoyaltyAmount);
    }

    /**
     * @dev Convert uint256 to string
     * @param value Value to convert
     * @return string representation
     */
    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }

    /**
     * @dev Get current dataset counter
     * @return Current dataset counter value
     */
    function getCurrentDatasetId() public view returns (uint256) {
        return _datasetIdCounter;
    }
}