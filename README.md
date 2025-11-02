# 🚀 Dataset Marketplace Smart Contracts

A decentralized data marketplace that enables secure dataset tokenization, automated access control, and seamless data monetization through smart contracts and NFT-based ownership systems.

## 🎯 Overview

The Dataset Marketplace transforms how organizations share, monetize, and access datasets by creating a trustless environment where data owners can tokenize their datasets as NFTs, set flexible pricing models, and automatically manage access rights through smart contracts.

## ✨ Key Features

### 🔐 Smart Contract-Powered Access Control
- **Automated Access Management**: Smart contracts handle all access permissions without manual intervention
- **Time-Bound Access**: Configurable access duration (1 hour to 365 days)
- **Instant Revocation**: Owners can revoke access immediately when needed
- **Transparent Permissions**: All access rights are verifiable on-chain

### 💎 NFT-Based Dataset Ownership
- **Dataset Ownership Tokens**: Each dataset is represented by a unique NFT
- **Access Rights Tokens**: Temporary NFTs for purchased access (non-transferable)
- **Transferable Ownership**: Dataset ownership can be transferred or sold
- **Metadata Integration**: Rich metadata stored on IPFS and linked to NFTs

### 💰 Flexible Monetization System
- **Dynamic Pricing**: Set custom prices for different access durations
- **Royalty System**: Configure royalty payments to multiple recipients (up to 10%)
- **Platform Fees**: Transparent platform fee structure (configurable, max 10%)
- **Revenue Analytics**: Real-time revenue tracking and analytics

### 🔄 Automated Payment Distribution
- **Multi-Party Payments**: Automatic distribution to owners, royalty recipients, and platform
- **Instant Settlement**: Payments processed immediately upon purchase
- **Fee Transparency**: All fees clearly displayed before purchase
- **Revenue Tracking**: Comprehensive transaction history and analytics

## 🏗️ Smart Contract Architecture

### DatasetToken Contract (ERC721)
NFT contract for ownership and access representation:

#### Core Functions
- `mintDatasetToken()`: Create ownership NFT for new datasets
- `mintAccessToken()`: Create temporary access NFT for purchases
- `hasValidAccess()`: Check if token provides valid access
- `burnExpiredToken()`: Remove expired access tokens

#### Token Types
- **Ownership Tokens**: Permanent NFTs representing dataset ownership (transferable)
- **Access Tokens**: Temporary NFTs for purchased access (non-transferable, expire automatically)

### DatasetAccess Contract
Main marketplace contract for dataset access management and monetization:

#### Dataset Management
- `createDataset()`: Register new datasets with metadata and pricing
- `updateDataset()`: Modify pricing and availability
- `getDataset()`: Retrieve dataset information and statistics

#### Access Control System
- `purchaseAccess()`: Buy time-bound access to datasets
- `checkAccess()`: Verify current access permissions
- `getAccessDetails()`: Get detailed access information including expiry
- `revokeAccess()`: Revoke access (owner/platform only)

#### Payment & Royalty System
- `setRoyalty()`: Configure royalty recipients and percentages
- Automatic payment splitting between owner, royalties, and platform
- `updatePlatformFee()`: Adjust platform fee (owner only)

## 🛠️ Technical Specifications

### Access Duration Options
- **1 Hour**: Short-term access for quick data analysis
- **24 Hours**: Daily access for ongoing projects
- **7 Days**: Weekly access for extended analysis
- **30 Days**: Monthly access for comprehensive projects
- **90 Days**: Quarterly access for long-term research
- **365 Days**: Annual access for continuous usage

### Security Features
- **Role-Based Access Control**: Multiple permission levels for different operations
- **Pausable Contracts**: Emergency pause functionality for security incidents
- **Reentrancy Protection**: Guards against reentrancy attacks
- **Input Validation**: Comprehensive validation of all user inputs
- **Safe Math**: Built-in overflow/underflow protection

### Gas Optimization
- **Efficient Storage**: Optimized data structures for minimal gas usage
- **Batch Operations**: Support for batch processing where applicable
- **Event Logging**: Comprehensive event emission for off-chain indexing

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Git

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd Dataset_Contract
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Compile contracts**
```bash
npm run compile
```

5. **Run tests**
```bash
npm test
```

### Deployment to Base Sepolia

1. **Configure your environment**
```bash
# Add to .env file
PRIVATE_KEY=your_private_key_here
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
BASESCAN_API_KEY=your_basescan_api_key_here
PLATFORM_WALLET=your_platform_wallet_address
PLATFORM_FEE_PERCENTAGE=250  # 2.5%
INITIAL_OWNER=your_initial_owner_address
```

2. **Deploy contracts**
```bash
npm run deploy:base-sepolia
```

3. **Verify contracts**
```bash
npm run verify
```

## 📋 Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `PRIVATE_KEY` | Deployer private key | ✅ | - |
| `BASE_SEPOLIA_RPC_URL` | Base Sepolia RPC endpoint | ✅ | https://sepolia.base.org |
| `BASESCAN_API_KEY` | BaseScan API key for verification | ✅ | - |
| `PLATFORM_WALLET` | Platform fee recipient address | ✅ | - |
| `PLATFORM_FEE_PERCENTAGE` | Platform fee in basis points | ❌ | 250 (2.5%) |
| `INITIAL_OWNER` | Initial contract owner | ❌ | Deployer address |

## 🧪 Testing

The project includes comprehensive test suites for both contracts:

```bash
# Run all tests
npm test

# Run specific test file
npx hardhat test test/DatasetToken.test.js
npx hardhat test test/DatasetAccess.test.js

# Run tests with gas reporting
npm run gas-report

# Run coverage analysis
npm run coverage
```

### Test Coverage
- **DatasetToken Contract**: 100% function coverage
- **DatasetAccess Contract**: 100% function coverage
- **Integration Tests**: End-to-end workflow testing
- **Edge Cases**: Comprehensive edge case handling

## 📊 Gas Costs (Estimated)

| Operation | Gas Cost | USD (at 20 gwei) |
|-----------|----------|-------------------|
| Deploy DatasetToken | ~2,500,000 | ~$15 |
| Deploy DatasetAccess | ~4,200,000 | ~$25 |
| Create Dataset | ~200,000 | ~$1.20 |
| Purchase Access | ~180,000 | ~$1.08 |
| Update Dataset | ~80,000 | ~$0.48 |
| Set Royalties | ~100,000 | ~$0.60 |

## 🔒 Security Considerations

### Auditing
- Contracts follow OpenZeppelin standards
- Comprehensive test coverage (>95%)
- Role-based access control implementation
- Reentrancy protection on all payable functions

### Best Practices
- Use of established patterns (ERC721, Ownable, Pausable)
- Input validation and error handling
- Event emission for transparency
- Gas optimization techniques

### Known Limitations
- Platform fee is capped at 10% for user protection
- Royalties are capped at 10% total to prevent abuse
- Access tokens are non-transferable by design

## 🌐 Network Support

### Mainnet
- **Base**: Supported (Chain ID: 8453)

### Testnets
- **Base Sepolia**: Supported (Chain ID: 84532) ✅

### Future Networks
- Ethereum Mainnet
- Polygon
- Arbitrum
- Optimism

## 📚 API Reference

### DatasetToken Contract

#### View Functions
```solidity
function hasValidAccess(uint256 tokenId) external view returns (bool)
function getAccessDetails(uint256 tokenId) external view returns (uint256, TokenType, uint256, bool)
function getUserTokens(address user) external view returns (uint256[] memory)
function getDatasetTokens(uint256 datasetId) external view returns (uint256[] memory)
```

#### State-Changing Functions
```solidity
function mintDatasetToken(address to, uint256 datasetId, string memory metadataURI) external returns (uint256)
function mintAccessToken(address to, uint256 datasetId, uint256 expiryTime, address originalOwner, string memory metadataURI) external returns (uint256)
function burnExpiredToken(uint256 tokenId) external
```

### DatasetAccess Contract

#### Dataset Management
```solidity
function createDataset(string memory metadataURI, uint256[6] memory prices) external returns (uint256)
function updateDataset(uint256 datasetId, string memory newMetadataURI, uint256[6] memory newPrices) external
function getDataset(uint256 datasetId) external view returns (...)
```

#### Access Control
```solidity
function purchaseAccess(uint256 datasetId, AccessDuration duration) external payable returns (uint256)
function checkAccess(address user, uint256 datasetId) external view returns (bool)
function revokeAccess(uint256 datasetId, address user) external
```

#### Royalty Management
```solidity
function setRoyalty(uint256 datasetId, address[] memory recipients, uint256[] memory percentages) external
function getRoyalties(uint256 datasetId) external view returns (address[] memory, uint256[] memory)
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow Solidity style guide
- Add comprehensive tests for new features
- Update documentation for API changes
- Ensure gas optimization where possible

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check this README and inline code comments
- **Issues**: Open an issue on GitHub for bugs or feature requests
- **Discussions**: Use GitHub Discussions for questions and ideas

## 🔗 Links

- **Base Sepolia Explorer**: https://sepolia.basescan.org/
- **Base Mainnet Explorer**: https://basescan.org/
- **OpenZeppelin Docs**: https://docs.openzeppelin.com/
- **Hardhat Docs**: https://hardhat.org/docs

---

**Built with ❤️ for the decentralized data economy**
# DataSet_Contract
