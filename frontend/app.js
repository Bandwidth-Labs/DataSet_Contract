// Main Application Class
class DatasetMarketplaceApp {
    constructor() {
        this.currentSection = 'home';
        this.datasets = new Map();
        this.userDatasets = [];
        this.userTokens = [];
        this.isLoading = false;
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.showSection('home');
        await this.loadInitialData();
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.dataset.section;
                this.showSection(section);
            });
        });

        // Wallet connection
        document.getElementById('connectWallet').addEventListener('click', () => {
            this.showWalletOptions();
        });

        document.getElementById('disconnectWallet').addEventListener('click', () => {
            this.disconnectWallet();
        });

        // Create dataset form
        document.getElementById('createDatasetForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleCreateDataset();
        });

        // Modal events
        document.querySelector('.modal-close').addEventListener('click', () => {
            this.closeModal();
        });

        document.getElementById('datasetModal').addEventListener('click', (e) => {
            if (e.target.id === 'datasetModal') {
                this.closeModal();
            }
        });

        // Search and filter
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.filterDatasets(e.target.value);
        });

        document.getElementById('sortBy').addEventListener('change', (e) => {
            this.sortDatasets(e.target.value);
        });

        // Web3 events
        window.addEventListener('accountChanged', (e) => {
            this.handleAccountChanged(e.detail);
        });

        window.addEventListener('walletDisconnected', () => {
            this.handleWalletDisconnected();
        });
    }

    showWalletOptions() {
        const options = [
            { name: 'MetaMask', action: () => this.connectMetaMask() },
            { name: 'WalletConnect', action: () => this.connectWalletConnect() }
        ];

        // Create a simple modal for wallet selection
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 400px;">
                <div class="modal-header">
                    <h3>Connect Wallet</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div style="display: flex; flex-direction: column; gap: 1rem;">
                        ${options.map(option => `
                            <button class="btn btn-primary btn-large wallet-option" data-wallet="${option.name}">
                                <i class="fas fa-wallet"></i>
                                ${option.name}
                            </button>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Add event listeners
        modal.querySelector('.modal-close').addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        modal.querySelectorAll('.wallet-option').forEach((btn, index) => {
            btn.addEventListener('click', () => {
                document.body.removeChild(modal);
                options[index].action();
            });
        });
    }

    async connectMetaMask() {
        try {
            this.showLoading('Connecting to MetaMask...');
            await web3Integration.initMetaMask();
            this.handleWalletConnected();
        } catch (error) {
            this.showToast('Failed to connect MetaMask: ' + error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }

    async connectWalletConnect() {
        try {
            this.showLoading('Connecting to WalletConnect...');
            await web3Integration.initWalletConnect();
            this.handleWalletConnected();
        } catch (error) {
            this.showToast('Failed to connect WalletConnect: ' + error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }

    async handleWalletConnected() {
        const connectBtn = document.getElementById('connectWallet');
        const walletInfo = document.getElementById('walletInfo');
        const walletAddress = document.getElementById('walletAddress');

        connectBtn.style.display = 'none';
        walletInfo.style.display = 'flex';
        walletAddress.textContent = web3Integration.formatAddress(web3Integration.account);

        this.showToast('Wallet connected successfully!', 'success');
        
        // Load user-specific data
        await this.loadUserData();
    }

    async disconnectWallet() {
        try {
            await web3Integration.disconnect();
            this.handleWalletDisconnected();
        } catch (error) {
            this.showToast('Error disconnecting wallet: ' + error.message, 'error');
        }
    }

    handleWalletDisconnected() {
        const connectBtn = document.getElementById('connectWallet');
        const walletInfo = document.getElementById('walletInfo');

        connectBtn.style.display = 'flex';
        walletInfo.style.display = 'none';

        // Clear user data
        this.userDatasets = [];
        this.userTokens = [];
        
        this.showToast('Wallet disconnected', 'warning');
    }

    async handleAccountChanged(newAccount) {
        const walletAddress = document.getElementById('walletAddress');
        walletAddress.textContent = web3Integration.formatAddress(newAccount);
        
        await this.loadUserData();
        this.showToast('Account changed', 'warning');
    }

    showSection(sectionName) {
        // Hide all sections
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });

        // Show target section
        document.getElementById(sectionName).classList.add('active');

        // Update navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');

        this.currentSection = sectionName;

        // Load section-specific data
        this.loadSectionData(sectionName);
    }

    async loadSectionData(sectionName) {
        switch (sectionName) {
            case 'browse':
                await this.loadAllDatasets();
                break;
            case 'my-datasets':
                if (web3Integration.isConnected) {
                    await this.loadMyDatasets();
                }
                break;
            case 'my-access':
                if (web3Integration.isConnected) {
                    await this.loadMyAccessTokens();
                }
                break;
        }
    }

    async loadInitialData() {
        try {
            // Load basic stats for home page
            await this.loadStats();
        } catch (error) {
            console.error('Error loading initial data:', error);
        }
    }

    async loadUserData() {
        if (!web3Integration.isConnected) return;

        try {
            await Promise.all([
                this.loadMyDatasets(),
                this.loadMyAccessTokens()
            ]);
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    }

    async loadStats() {
        try {
            const currentDatasetId = await web3Integration.getCurrentDatasetId();
            document.getElementById('totalDatasets').textContent = Math.max(0, currentDatasetId - 1);
            
            // You can add more stats here by querying the contracts
            document.getElementById('totalSales').textContent = '0'; // Placeholder
            document.getElementById('activeUsers').textContent = '0'; // Placeholder
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    async loadAllDatasets() {
        try {
            this.showLoadingSpinner(true);
            
            const currentDatasetId = await web3Integration.getCurrentDatasetId();
            const datasets = [];

            // Load all datasets
            for (let i = 1; i < currentDatasetId; i++) {
                try {
                    const dataset = await web3Integration.getDataset(i);
                    if (dataset.isActive) {
                        // Load metadata
                        const metadata = await this.loadMetadata(dataset.metadataURI);
                        datasets.push({ ...dataset, metadata });
                        this.datasets.set(i, { ...dataset, metadata });
                    }
                } catch (error) {
                    console.error(`Error loading dataset ${i}:`, error);
                }
            }

            this.renderDatasets(datasets);
        } catch (error) {
            console.error('Error loading datasets:', error);
            this.showToast('Error loading datasets', 'error');
        } finally {
            this.showLoadingSpinner(false);
        }
    }

    async loadMyDatasets() {
        if (!web3Integration.isConnected) return;

        try {
            const datasetIds = await web3Integration.getUserDatasets();
            const datasets = [];

            for (const id of datasetIds) {
                try {
                    const dataset = await web3Integration.getDataset(id);
                    const metadata = await this.loadMetadata(dataset.metadataURI);
                    datasets.push({ ...dataset, metadata });
                } catch (error) {
                    console.error(`Error loading user dataset ${id}:`, error);
                }
            }

            this.userDatasets = datasets;
            this.renderMyDatasets(datasets);
        } catch (error) {
            console.error('Error loading user datasets:', error);
        }
    }

    async loadMyAccessTokens() {
        if (!web3Integration.isConnected) return;

        try {
            const tokenIds = await web3Integration.getUserTokens();
            const tokens = [];

            for (const tokenId of tokenIds) {
                try {
                    const tokenDetails = await web3Integration.getTokenDetails(tokenId);
                    if (tokenDetails.tokenType === 1) { // ACCESS token
                        const dataset = await web3Integration.getDataset(tokenDetails.datasetId);
                        const metadata = await this.loadMetadata(dataset.metadataURI);
                        tokens.push({
                            tokenId,
                            ...tokenDetails,
                            dataset: { ...dataset, metadata }
                        });
                    }
                } catch (error) {
                    console.error(`Error loading token ${tokenId}:`, error);
                }
            }

            this.userTokens = tokens;
            this.renderMyAccessTokens(tokens);
        } catch (error) {
            console.error('Error loading user tokens:', error);
        }
    }

    async loadMetadata(metadataURI) {
        try {
            // Handle IPFS URIs
            let url = metadataURI;
            if (metadataURI.startsWith('ipfs://')) {
                url = CONFIG.IPFS.gateway + metadataURI.replace('ipfs://', '');
            }

            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to fetch metadata');
            
            return await response.json();
        } catch (error) {
            console.error('Error loading metadata:', error);
            return {
                name: 'Unknown Dataset',
                description: 'Metadata unavailable',
                category: 'unknown'
            };
        }
    }

    renderDatasets(datasets) {
        const grid = document.getElementById('datasetsGrid');
        
        if (datasets.length === 0) {
            grid.innerHTML = '<p>No datasets found.</p>';
            return;
        }

        grid.innerHTML = datasets.map(dataset => `
            <div class="dataset-card" onclick="app.showDatasetModal(${dataset.id})">
                <h3>${dataset.metadata.name || 'Unnamed Dataset'}</h3>
                <p>${dataset.metadata.description || 'No description available'}</p>
                <div class="dataset-meta">
                    <span class="meta-item">
                        <i class="fas fa-user"></i>
                        ${web3Integration.formatAddress(dataset.owner)}
                    </span>
                    <span class="meta-item">
                        <i class="fas fa-calendar"></i>
                        ${web3Integration.formatTimestamp(dataset.createdAt)}
                    </span>
                    <span class="meta-item">
                        <i class="fas fa-chart-line"></i>
                        ${dataset.totalSales} sales
                    </span>
                </div>
                <div class="dataset-price">
                    From ${Math.min(...dataset.prices.filter(p => parseFloat(p) > 0))} ETH
                </div>
            </div>
        `).join('');
    }

    renderMyDatasets(datasets) {
        const grid = document.getElementById('myDatasetsGrid');
        
        if (datasets.length === 0) {
            grid.innerHTML = '<p>You haven\'t created any datasets yet.</p>';
            return;
        }

        grid.innerHTML = datasets.map(dataset => `
            <div class="dataset-card">
                <h3>${dataset.metadata.name || 'Unnamed Dataset'}</h3>
                <p>${dataset.metadata.description || 'No description available'}</p>
                <div class="dataset-meta">
                    <span class="meta-item">
                        <i class="fas fa-calendar"></i>
                        ${web3Integration.formatTimestamp(dataset.createdAt)}
                    </span>
                    <span class="meta-item">
                        <i class="fas fa-chart-line"></i>
                        ${dataset.totalSales} sales
                    </span>
                    <span class="meta-item">
                        <i class="fas fa-dollar-sign"></i>
                        ${parseFloat(web3Integration.formatEther(dataset.totalRevenue)).toFixed(4)} ETH earned
                    </span>
                </div>
                <div class="dataset-price">
                    Status: ${dataset.isActive ? 'Active' : 'Inactive'}
                </div>
            </div>
        `).join('');
    }

    renderMyAccessTokens(tokens) {
        const grid = document.getElementById('myAccessGrid');
        
        if (tokens.length === 0) {
            grid.innerHTML = '<p>You don\'t have any access tokens yet.</p>';
            return;
        }

        grid.innerHTML = tokens.map(token => {
            const isExpired = web3Integration.isExpired(token.expiryTime);
            const timeRemaining = web3Integration.getTimeRemaining(token.expiryTime);
            
            return `
                <div class="access-token-card ${isExpired ? 'expired' : ''}">
                    <h4>${token.dataset.metadata.name || 'Unnamed Dataset'}</h4>
                    <div class="access-status ${isExpired ? 'expired' : 'active'}">
                        ${isExpired ? 'Expired' : 'Active'}
                    </div>
                    <p>${token.dataset.metadata.description || 'No description available'}</p>
                    <div class="dataset-meta">
                        <span class="meta-item">
                            <i class="fas fa-clock"></i>
                            ${timeRemaining}
                        </span>
                        <span class="meta-item">
                            <i class="fas fa-calendar"></i>
                            Expires: ${web3Integration.formatTimestamp(token.expiryTime)}
                        </span>
                    </div>
                </div>
            `;
        }).join('');
    }

    showDatasetModal(datasetId) {
        const dataset = this.datasets.get(datasetId);
        if (!dataset) return;

        const modal = document.getElementById('datasetModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalDescription = document.getElementById('modalDescription');
        const modalOwner = document.getElementById('modalOwner');
        const modalCreated = document.getElementById('modalCreated');
        const modalSales = document.getElementById('modalSales');

        modalTitle.textContent = dataset.metadata.name || 'Unnamed Dataset';
        modalDescription.textContent = dataset.metadata.description || 'No description available';
        modalOwner.textContent = web3Integration.formatAddress(dataset.owner);
        modalCreated.textContent = web3Integration.formatTimestamp(dataset.createdAt);
        modalSales.textContent = dataset.totalSales;

        // Update prices
        dataset.prices.forEach((price, index) => {
            const priceElement = document.getElementById(`modalPrice${index}`);
            if (priceElement) {
                priceElement.textContent = `${price} ETH`;
            }
        });

        // Add purchase event listeners
        document.querySelectorAll('.access-option button').forEach((btn, index) => {
            btn.onclick = () => this.purchaseAccess(datasetId, index, dataset.prices[index]);
        });

        modal.classList.add('active');
    }

    closeModal() {
        document.getElementById('datasetModal').classList.remove('active');
    }

    async purchaseAccess(datasetId, duration, price) {
        if (!web3Integration.isConnected) {
            this.showToast('Please connect your wallet first', 'warning');
            return;
        }

        if (parseFloat(price) === 0) {
            this.showToast('This access option is not available', 'warning');
            return;
        }

        try {
            this.showLoading('Purchasing access...');
            
            const tx = await web3Integration.purchaseAccess(datasetId, duration, price);
            
            this.showToast('Access purchased successfully!', 'success');
            this.closeModal();
            
            // Refresh user data
            await this.loadMyAccessTokens();
        } catch (error) {
            console.error('Error purchasing access:', error);
            this.showToast('Failed to purchase access: ' + error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }

    async handleCreateDataset() {
        if (!web3Integration.isConnected) {
            this.showToast('Please connect your wallet first', 'warning');
            return;
        }

        try {
            this.showLoading('Creating dataset...');

            // Get form data
            const title = document.getElementById('datasetTitle').value;
            const description = document.getElementById('datasetDescription').value;
            const category = document.getElementById('datasetCategory').value;
            const file = document.getElementById('datasetFile').files[0];

            const prices = [
                document.getElementById('price1h').value || '0',
                document.getElementById('price24h').value || '0',
                document.getElementById('price7d').value || '0',
                document.getElementById('price30d').value || '0',
                document.getElementById('price90d').value || '0',
                document.getElementById('price365d').value || '0'
            ];

            // Create metadata object
            const metadata = {
                name: title,
                description: description,
                category: category,
                createdAt: Date.now(),
                file: file ? file.name : null
            };

            // For demo purposes, we'll use a placeholder IPFS URI
            // In a real implementation, you would upload to IPFS
            const metadataURI = `ipfs://placeholder/${Date.now()}`;

            // Create dataset on blockchain
            const tx = await web3Integration.createDataset(metadataURI, prices);

            this.showToast('Dataset created successfully!', 'success');
            
            // Reset form
            document.getElementById('createDatasetForm').reset();
            
            // Refresh data
            await this.loadMyDatasets();
            
        } catch (error) {
            console.error('Error creating dataset:', error);
            this.showToast('Failed to create dataset: ' + error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }

    filterDatasets(searchTerm) {
        const cards = document.querySelectorAll('#datasetsGrid .dataset-card');
        
        cards.forEach(card => {
            const title = card.querySelector('h3').textContent.toLowerCase();
            const description = card.querySelector('p').textContent.toLowerCase();
            const isMatch = title.includes(searchTerm.toLowerCase()) || 
                          description.includes(searchTerm.toLowerCase());
            
            card.style.display = isMatch ? 'block' : 'none';
        });
    }

    sortDatasets(sortBy) {
        // Implementation for sorting datasets
        // This would require storing dataset data and re-rendering
        console.log('Sorting by:', sortBy);
    }

    showLoading(message = 'Loading...') {
        const overlay = document.getElementById('loadingOverlay');
        const text = document.getElementById('loadingText');
        text.textContent = message;
        overlay.classList.add('active');
        this.isLoading = true;
    }

    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        overlay.classList.remove('active');
        this.isLoading = false;
    }

    showLoadingSpinner(show) {
        const spinner = document.getElementById('loadingSpinner');
        spinner.style.display = show ? 'flex' : 'none';
    }

    showToast(message, type = 'success') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle'
        };

        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i class="toast-icon ${icons[type]}"></i>
            <span class="toast-message">${message}</span>
            <button class="toast-close">&times;</button>
        `;

        container.appendChild(toast);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                container.removeChild(toast);
            }
        }, 5000);

        // Manual close
        toast.querySelector('.toast-close').addEventListener('click', () => {
            container.removeChild(toast);
        });
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new DatasetMarketplaceApp();
});

<function_calls>
<invoke name="todo_list">
<parameter name="todos">[{"id": "1", "content": "Analyze smart contracts to understand available functions", "status": "completed", "priority": "high"}, {"id": "2", "content": "Create frontend structure with HTML, CSS, and JavaScript", "status": "completed", "priority": "high"}, {"id": "3", "content": "Integrate Web3 wallet connection (WalletConnect/Reown)", "status": "completed", "priority": "high"}, {"id": "4", "content": "Implement smart contract interaction functions", "status": "completed", "priority": "high"}, {"id": "5", "content": "Create UI for dataset creation and management", "status": "completed", "priority": "medium"}, {"id": "6", "content": "Create UI for purchasing dataset access", "status": "completed", "priority": "medium"}, {"id": "7", "content": "Add access checking and token management", "status": "completed", "priority": "medium"}, {"id": "8", "content": "Style the application with modern UI", "status": "completed", "priority": "low"}, {"id": "9", "content": "Create README with setup instructions", "status": "in_progress", "priority": "medium"}]
