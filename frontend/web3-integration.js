// Web3 Integration Class
class Web3Integration {
    constructor() {
        this.web3 = null;
        this.provider = null;
        this.account = null;
        this.chainId = null;
        this.datasetTokenContract = null;
        this.datasetAccessContract = null;
        this.isConnected = false;
    }

    // Initialize WalletConnect Provider
    async initWalletConnect() {
        try {
            // Create WalletConnect Provider
            this.provider = new WalletConnectProvider.default({
                projectId: CONFIG.WALLET_CONNECT.projectId,
                chains: [8453], // Base Mainnet
                showQrModal: true,
                metadata: CONFIG.WALLET_CONNECT.metadata
            });

            // Enable session (triggers QR Code modal)
            await this.provider.enable();

            // Create Web3 instance
            this.web3 = new Web3(this.provider);

            // Get account and chain info
            const accounts = await this.web3.eth.getAccounts();
            this.account = accounts[0];
            this.chainId = await this.web3.eth.getChainId();

            // Initialize contracts
            this.initContracts();

            // Set up event listeners
            this.setupEventListeners();

            this.isConnected = true;
            return true;
        } catch (error) {
            console.error('Failed to connect wallet:', error);
            throw error;
        }
    }

    // Initialize MetaMask/Injected Provider
    async initMetaMask() {
        try {
            if (typeof window.ethereum === 'undefined') {
                throw new Error('MetaMask is not installed');
            }

            // Request account access
            await window.ethereum.request({ method: 'eth_requestAccounts' });

            // Create Web3 instance
            this.web3 = new Web3(window.ethereum);
            this.provider = window.ethereum;

            // Get account and chain info
            const accounts = await this.web3.eth.getAccounts();
            this.account = accounts[0];
            this.chainId = await this.web3.eth.getChainId();

            // Check if we're on the correct network
            await this.checkNetwork();

            // Initialize contracts
            this.initContracts();

            // Set up event listeners
            this.setupEventListeners();

            this.isConnected = true;
            return true;
        } catch (error) {
            console.error('Failed to connect MetaMask:', error);
            throw error;
        }
    }

    // Check and switch to correct network
    async checkNetwork() {
        const targetChainId = parseInt(CONFIG.NETWORK.chainId, 16);
        
        if (this.chainId !== targetChainId) {
            try {
                // Try to switch to Base network
                await this.provider.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: CONFIG.NETWORK.chainId }],
                });
            } catch (switchError) {
                // If network doesn't exist, add it
                if (switchError.code === 4902) {
                    await this.provider.request({
                        method: 'wallet_addEthereumChain',
                        params: [CONFIG.NETWORK],
                    });
                } else {
                    throw switchError;
                }
            }
            
            // Update chain ID after switch
            this.chainId = await this.web3.eth.getChainId();
        }
    }

    // Initialize smart contracts
    initContracts() {
        this.datasetTokenContract = new this.web3.eth.Contract(
            DATASET_TOKEN_ABI,
            CONFIG.CONTRACTS.DATASET_TOKEN
        );

        this.datasetAccessContract = new this.web3.eth.Contract(
            DATASET_ACCESS_ABI,
            CONFIG.CONTRACTS.DATASET_ACCESS
        );
    }

    // Set up event listeners
    setupEventListeners() {
        if (this.provider.on) {
            this.provider.on('accountsChanged', (accounts) => {
                if (accounts.length === 0) {
                    this.disconnect();
                } else {
                    this.account = accounts[0];
                    window.dispatchEvent(new CustomEvent('accountChanged', { detail: this.account }));
                }
            });

            this.provider.on('chainChanged', (chainId) => {
                this.chainId = parseInt(chainId, 16);
                window.dispatchEvent(new CustomEvent('chainChanged', { detail: this.chainId }));
            });

            this.provider.on('disconnect', () => {
                this.disconnect();
            });
        }
    }

    // Disconnect wallet
    async disconnect() {
        try {
            if (this.provider && this.provider.disconnect) {
                await this.provider.disconnect();
            }
            
            this.web3 = null;
            this.provider = null;
            this.account = null;
            this.chainId = null;
            this.datasetTokenContract = null;
            this.datasetAccessContract = null;
            this.isConnected = false;

            window.dispatchEvent(new CustomEvent('walletDisconnected'));
        } catch (error) {
            console.error('Error disconnecting wallet:', error);
        }
    }

    // Get account balance
    async getBalance() {
        if (!this.web3 || !this.account) return '0';
        
        try {
            const balance = await this.web3.eth.getBalance(this.account);
            return this.web3.utils.fromWei(balance, 'ether');
        } catch (error) {
            console.error('Error getting balance:', error);
            return '0';
        }
    }

    // Dataset Access Contract Methods
    async createDataset(metadataURI, prices) {
        if (!this.datasetAccessContract) throw new Error('Contract not initialized');

        try {
            const pricesInWei = prices.map(price => this.web3.utils.toWei(price.toString(), 'ether'));
            
            const tx = await this.datasetAccessContract.methods
                .createDataset(metadataURI, pricesInWei)
                .send({ from: this.account });

            return tx;
        } catch (error) {
            console.error('Error creating dataset:', error);
            throw error;
        }
    }

    async purchaseAccess(datasetId, duration, price) {
        if (!this.datasetAccessContract) throw new Error('Contract not initialized');

        try {
            const priceInWei = this.web3.utils.toWei(price.toString(), 'ether');
            
            const tx = await this.datasetAccessContract.methods
                .purchaseAccess(datasetId, duration)
                .send({ 
                    from: this.account,
                    value: priceInWei
                });

            return tx;
        } catch (error) {
            console.error('Error purchasing access:', error);
            throw error;
        }
    }

    async getDataset(datasetId) {
        if (!this.datasetAccessContract) throw new Error('Contract not initialized');

        try {
            const dataset = await this.datasetAccessContract.methods
                .getDataset(datasetId)
                .call();

            return {
                id: dataset.id,
                owner: dataset.owner,
                metadataURI: dataset.metadataURI,
                isActive: dataset.isActive,
                createdAt: dataset.createdAt,
                totalSales: dataset.totalSales,
                totalRevenue: dataset.totalRevenue,
                prices: dataset.prices.map(price => this.web3.utils.fromWei(price, 'ether'))
            };
        } catch (error) {
            console.error('Error getting dataset:', error);
            throw error;
        }
    }

    async getUserDatasets(userAddress = null) {
        if (!this.datasetAccessContract) throw new Error('Contract not initialized');

        try {
            const address = userAddress || this.account;
            const datasetIds = await this.datasetAccessContract.methods
                .getUserDatasets(address)
                .call();

            return datasetIds;
        } catch (error) {
            console.error('Error getting user datasets:', error);
            throw error;
        }
    }

    async checkAccess(userAddress, datasetId) {
        if (!this.datasetAccessContract) throw new Error('Contract not initialized');

        try {
            const hasAccess = await this.datasetAccessContract.methods
                .checkAccess(userAddress, datasetId)
                .call();

            return hasAccess;
        } catch (error) {
            console.error('Error checking access:', error);
            throw error;
        }
    }

    async getAccessDetails(userAddress, datasetId) {
        if (!this.datasetAccessContract) throw new Error('Contract not initialized');

        try {
            const details = await this.datasetAccessContract.methods
                .getAccessDetails(userAddress, datasetId)
                .call();

            return {
                hasAccess: details.hasAccess,
                expiryTime: details.expiryTime,
                tokenId: details.tokenId
            };
        } catch (error) {
            console.error('Error getting access details:', error);
            throw error;
        }
    }

    async getCurrentDatasetId() {
        if (!this.datasetAccessContract) throw new Error('Contract not initialized');

        try {
            const currentId = await this.datasetAccessContract.methods
                .getCurrentDatasetId()
                .call();

            return parseInt(currentId);
        } catch (error) {
            console.error('Error getting current dataset ID:', error);
            throw error;
        }
    }

    // Dataset Token Contract Methods
    async getUserTokens(userAddress = null) {
        if (!this.datasetTokenContract) throw new Error('Contract not initialized');

        try {
            const address = userAddress || this.account;
            const tokenIds = await this.datasetTokenContract.methods
                .getUserTokens(address)
                .call();

            return tokenIds;
        } catch (error) {
            console.error('Error getting user tokens:', error);
            throw error;
        }
    }

    async getTokenDetails(tokenId) {
        if (!this.datasetTokenContract) throw new Error('Contract not initialized');

        try {
            const details = await this.datasetTokenContract.methods
                .getAccessDetails(tokenId)
                .call();

            const tokenURI = await this.datasetTokenContract.methods
                .tokenURI(tokenId)
                .call();

            return {
                datasetId: details.datasetId,
                tokenType: details.tokenType,
                expiryTime: details.expiryTime,
                isValid: details.isValid,
                tokenURI: tokenURI
            };
        } catch (error) {
            console.error('Error getting token details:', error);
            throw error;
        }
    }

    async hasValidAccess(tokenId) {
        if (!this.datasetTokenContract) throw new Error('Contract not initialized');

        try {
            const isValid = await this.datasetTokenContract.methods
                .hasValidAccess(tokenId)
                .call();

            return isValid;
        } catch (error) {
            console.error('Error checking token validity:', error);
            throw error;
        }
    }

    // Utility Methods
    formatAddress(address) {
        if (!address) return '';
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }

    formatEther(weiValue) {
        if (!this.web3) return '0';
        return this.web3.utils.fromWei(weiValue.toString(), 'ether');
    }

    toWei(etherValue) {
        if (!this.web3) return '0';
        return this.web3.utils.toWei(etherValue.toString(), 'ether');
    }

    formatTimestamp(timestamp) {
        const date = new Date(parseInt(timestamp) * 1000);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    }

    isExpired(timestamp) {
        return parseInt(timestamp) * 1000 < Date.now();
    }

    getTimeRemaining(timestamp) {
        const now = Date.now();
        const expiry = parseInt(timestamp) * 1000;
        const remaining = expiry - now;

        if (remaining <= 0) return 'Expired';

        const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
        const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

        if (days > 0) return `${days}d ${hours}h`;
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    }
}

// Create global instance
window.web3Integration = new Web3Integration();
