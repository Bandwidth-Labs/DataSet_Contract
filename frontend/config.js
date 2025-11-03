// Contract Configuration
const CONFIG = {
    // Network Configuration
    NETWORK: {
        chainId: '0x2105', // Base Mainnet (8453)
        chainName: 'Base',
        nativeCurrency: {
            name: 'Ethereum',
            symbol: 'ETH',
            decimals: 18
        },
        rpcUrls: ['https://mainnet.base.org'],
        blockExplorerUrls: ['https://basescan.org']
    },

    // Contract Addresses
    CONTRACTS: {
        DATASET_TOKEN: '0xa0a22cbB9Dd49451236936F7ef10395c1A346BC4',
        DATASET_ACCESS: '0xE09FD11f6FC9e0C5C58Fe2F3363A898bFeF1F785'
    },

    // WalletConnect Configuration
    WALLET_CONNECT: {
        projectId: '982f175981feaa4270a11ee31a1231d6',
        metadata: {
            name: 'Dataset Marketplace',
            description: 'Decentralized Dataset Marketplace on Base',
            url: window.location.origin,
            icons: ['https://walletconnect.com/walletconnect-logo.png']
        }
    },

    // IPFS Configuration (you can use Pinata, Infura, or other IPFS providers)
    IPFS: {
        gateway: 'https://gateway.pinata.cloud/ipfs/',
        uploadEndpoint: 'https://api.pinata.cloud/pinning/pinFileToIPFS' // You'll need to add your API key
    }
};

// Contract ABIs
const DATASET_TOKEN_ABI = [
    {
        "inputs": [
            {"internalType": "address", "name": "initialOwner", "type": "address"}
        ],
        "stateMutability": "nonpayable",
        "type": "constructor"
    },
    {
        "inputs": [
            {"internalType": "address", "name": "to", "type": "address"},
            {"internalType": "uint256", "name": "datasetId", "type": "uint256"},
            {"internalType": "string", "name": "metadataURI", "type": "string"}
        ],
        "name": "mintDatasetToken",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {"internalType": "address", "name": "to", "type": "address"},
            {"internalType": "uint256", "name": "datasetId", "type": "uint256"},
            {"internalType": "uint256", "name": "expiryTime", "type": "uint256"},
            {"internalType": "address", "name": "originalOwner", "type": "address"},
            {"internalType": "string", "name": "metadataURI", "type": "string"}
        ],
        "name": "mintAccessToken",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
        "name": "hasValidAccess",
        "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
        "name": "getAccessDetails",
        "outputs": [
            {"internalType": "uint256", "name": "datasetId", "type": "uint256"},
            {"internalType": "enum DatasetToken.TokenType", "name": "tokenType", "type": "uint8"},
            {"internalType": "uint256", "name": "expiryTime", "type": "uint256"},
            {"internalType": "bool", "name": "isValid", "type": "bool"}
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
        "name": "getUserTokens",
        "outputs": [{"internalType": "uint256[]", "name": "", "type": "uint256[]"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "uint256", "name": "datasetId", "type": "uint256"}],
        "name": "getDatasetTokens",
        "outputs": [{"internalType": "uint256[]", "name": "", "type": "uint256[]"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
        "name": "ownerOf",
        "outputs": [{"internalType": "address", "name": "", "type": "address"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
        "name": "tokenURI",
        "outputs": [{"internalType": "string", "name": "", "type": "string"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "address", "name": "owner", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    }
];

const DATASET_ACCESS_ABI = [
    {
        "inputs": [
            {"internalType": "address", "name": "_datasetToken", "type": "address"},
            {"internalType": "address", "name": "_platformWallet", "type": "address"},
            {"internalType": "uint256", "name": "_platformFeePercentage", "type": "uint256"},
            {"internalType": "address", "name": "_initialOwner", "type": "address"}
        ],
        "stateMutability": "nonpayable",
        "type": "constructor"
    },
    {
        "inputs": [
            {"internalType": "string", "name": "metadataURI", "type": "string"},
            {"internalType": "uint256[6]", "name": "prices", "type": "uint256[6]"}
        ],
        "name": "createDataset",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {"internalType": "uint256", "name": "datasetId", "type": "uint256"},
            {"internalType": "string", "name": "newMetadataURI", "type": "string"},
            {"internalType": "uint256[6]", "name": "newPrices", "type": "uint256[6]"}
        ],
        "name": "updateDataset",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {"internalType": "uint256", "name": "datasetId", "type": "uint256"},
            {"internalType": "enum DatasetAccess.AccessDuration", "name": "duration", "type": "uint8"}
        ],
        "name": "purchaseAccess",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "payable",
        "type": "function"
    },
    {
        "inputs": [
            {"internalType": "address", "name": "user", "type": "address"},
            {"internalType": "uint256", "name": "datasetId", "type": "uint256"}
        ],
        "name": "checkAccess",
        "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {"internalType": "address", "name": "user", "type": "address"},
            {"internalType": "uint256", "name": "datasetId", "type": "uint256"}
        ],
        "name": "getAccessDetails",
        "outputs": [
            {"internalType": "bool", "name": "hasAccess", "type": "bool"},
            {"internalType": "uint256", "name": "expiryTime", "type": "uint256"},
            {"internalType": "uint256", "name": "tokenId", "type": "uint256"}
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "uint256", "name": "datasetId", "type": "uint256"}],
        "name": "getDataset",
        "outputs": [
            {"internalType": "uint256", "name": "id", "type": "uint256"},
            {"internalType": "address", "name": "owner", "type": "address"},
            {"internalType": "string", "name": "metadataURI", "type": "string"},
            {"internalType": "bool", "name": "isActive", "type": "bool"},
            {"internalType": "uint256", "name": "createdAt", "type": "uint256"},
            {"internalType": "uint256", "name": "totalSales", "type": "uint256"},
            {"internalType": "uint256", "name": "totalRevenue", "type": "uint256"},
            {"internalType": "uint256[6]", "name": "prices", "type": "uint256[6]"}
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
        "name": "getUserDatasets",
        "outputs": [{"internalType": "uint256[]", "name": "", "type": "uint256[]"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
        "name": "getUserPurchases",
        "outputs": [{"internalType": "uint256[]", "name": "", "type": "uint256[]"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "getCurrentDatasetId",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    }
];

// Access Duration Enum
const ACCESS_DURATION = {
    HOUR_1: 0,
    HOURS_24: 1,
    DAYS_7: 2,
    DAYS_30: 3,
    DAYS_90: 4,
    DAYS_365: 5
};

// Duration Labels
const DURATION_LABELS = {
    [ACCESS_DURATION.HOUR_1]: '1 Hour',
    [ACCESS_DURATION.HOURS_24]: '24 Hours',
    [ACCESS_DURATION.DAYS_7]: '7 Days',
    [ACCESS_DURATION.DAYS_30]: '30 Days',
    [ACCESS_DURATION.DAYS_90]: '90 Days',
    [ACCESS_DURATION.DAYS_365]: '365 Days'
};

// Export configuration
window.CONFIG = CONFIG;
window.DATASET_TOKEN_ABI = DATASET_TOKEN_ABI;
window.DATASET_ACCESS_ABI = DATASET_ACCESS_ABI;
window.ACCESS_DURATION = ACCESS_DURATION;
window.DURATION_LABELS = DURATION_LABELS;
