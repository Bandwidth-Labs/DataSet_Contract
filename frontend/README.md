# Dataset Marketplace Frontend

A decentralized marketplace for buying and selling dataset access tokens built on Base mainnet. This frontend application provides a user-friendly interface to interact with the DatasetToken and DatasetAccess smart contracts.

## 🌟 Features

- **Wallet Integration**: Connect with MetaMask or WalletConnect/Reown
- **Dataset Management**: Create, browse, and manage datasets
- **Access Token System**: Purchase temporary access with flexible durations (1 hour to 365 days)
- **Modern UI**: Responsive design with beautiful animations and transitions
- **Real-time Updates**: Live data from Base blockchain
- **Token Management**: View and manage your access tokens

## 🚀 Quick Start

### Prerequisites

- A modern web browser (Chrome, Firefox, Safari, Edge)
- MetaMask extension or WalletConnect-compatible wallet
- Some ETH on Base mainnet for transactions

### Installation

1. **Clone or download the frontend files**:
   ```bash
   # If you have the project repository
   cd frontend/
   
   # Or create a new directory and add the files
   mkdir dataset-marketplace-frontend
   cd dataset-marketplace-frontend
   ```

2. **Add the frontend files**:
   - `index.html` - Main HTML file
   - `styles.css` - CSS styles
   - `config.js` - Configuration and contract ABIs
   - `web3-integration.js` - Web3 and smart contract integration
   - `app.js` - Main application logic

3. **Serve the files**:
   
   **Option A: Using Python (recommended)**
   ```bash
   # Python 3
   python -m http.server 8000
   
   # Python 2
   python -m SimpleHTTPServer 8000
   ```
   
   **Option B: Using Node.js**
   ```bash
   npx serve .
   ```
   
   **Option C: Using PHP**
   ```bash
   php -S localhost:8000
   ```

4. **Open in browser**:
   Navigate to `http://localhost:8000` in your web browser.

## 🔧 Configuration

The application is pre-configured for Base mainnet with the following contracts:

- **DatasetToken Contract**: `0xa0a22cbB9Dd49451236936F7ef10395c1A346BC4`
- **DatasetAccess Contract**: `0xE09FD11f6FC9e0C5C58Fe2F3363A898bFeF1F785`
- **WalletConnect Project ID**: `982f175981feaa4270a11ee31a1231d6`

### Customizing Configuration

Edit `config.js` to modify:

```javascript
const CONFIG = {
    NETWORK: {
        chainId: '0x2105', // Base Mainnet
        chainName: 'Base',
        // ... other network settings
    },
    CONTRACTS: {
        DATASET_TOKEN: 'your_dataset_token_address',
        DATASET_ACCESS: 'your_dataset_access_address'
    },
    WALLET_CONNECT: {
        projectId: 'your_walletconnect_project_id'
    }
};
```

## 📱 Usage Guide

### 1. Connect Your Wallet

1. Click "Connect Wallet" in the top navigation
2. Choose between MetaMask or WalletConnect
3. Follow the prompts to connect your wallet
4. Ensure you're on Base mainnet (the app will prompt to switch networks)

### 2. Browse Datasets

1. Navigate to the "Browse" section
2. Use the search bar to find specific datasets
3. Sort by newest, oldest, or price
4. Click on any dataset card to view details and purchase options

### 3. Purchase Dataset Access

1. Click on a dataset to open the modal
2. Choose your desired access duration (1 hour to 365 days)
3. Click "Buy Access" for your chosen duration
4. Confirm the transaction in your wallet
5. Access token will appear in "My Access" section

### 4. Create a Dataset

1. Navigate to the "Create" section
2. Fill in dataset details:
   - Title and description
   - Category selection
   - Upload dataset file
   - Set pricing for different access durations
3. Click "Create Dataset"
4. Confirm the transaction in your wallet
5. Your dataset will appear in "My Datasets" section

### 5. Manage Your Assets

- **My Datasets**: View datasets you've created, track sales and revenue
- **My Access**: View your purchased access tokens and their expiration times

## 🏗️ Architecture

### File Structure

```
frontend/
├── index.html              # Main HTML structure
├── styles.css              # CSS styles and responsive design
├── config.js               # Configuration and contract ABIs
├── web3-integration.js     # Web3 and blockchain integration
├── app.js                  # Main application logic
└── README.md              # This documentation
```

### Key Components

1. **Web3Integration Class**: Handles wallet connections and smart contract interactions
2. **DatasetMarketplaceApp Class**: Main application logic and UI management
3. **Responsive Design**: Mobile-first CSS with modern styling
4. **Modal System**: For dataset details and wallet connection
5. **Toast Notifications**: User feedback for actions and errors

### Smart Contract Integration

The frontend integrates with two main contracts:

- **DatasetToken (ERC721)**: Manages ownership and access tokens
- **DatasetAccess**: Handles marketplace functionality, payments, and access control

## 🎨 Customization

### Styling

The application uses CSS custom properties for easy theming:

```css
:root {
    --primary-color: #2563eb;
    --secondary-color: #64748b;
    --success-color: #10b981;
    --error-color: #ef4444;
    /* ... more variables */
}
```

### Adding Features

To add new features:

1. Add UI elements to `index.html`
2. Style them in `styles.css`
3. Add event handlers in `app.js`
4. Add smart contract methods in `web3-integration.js`

## 🔒 Security Considerations

- Never store private keys in the frontend code
- Always validate user inputs
- Use HTTPS in production
- Implement proper error handling
- Keep dependencies updated

## 🌐 Deployment

### Production Deployment

1. **Static Hosting** (Recommended):
   - Netlify: Drag and drop the frontend folder
   - Vercel: Connect your Git repository
   - GitHub Pages: Push to a repository and enable Pages

2. **Traditional Web Hosting**:
   - Upload files to your web server
   - Ensure HTTPS is enabled
   - Configure proper MIME types for `.js` files

3. **IPFS Deployment**:
   - Upload to IPFS for decentralized hosting
   - Use services like Pinata or Infura

### Environment Variables

For production, consider using environment variables for sensitive configuration:

```javascript
const CONFIG = {
    WALLET_CONNECT: {
        projectId: process.env.WALLETCONNECT_PROJECT_ID || 'fallback_id'
    }
};
```

## 🐛 Troubleshooting

### Common Issues

1. **Wallet Connection Fails**:
   - Ensure MetaMask is installed and unlocked
   - Check if you're on the correct network (Base mainnet)
   - Try refreshing the page

2. **Transactions Fail**:
   - Check if you have sufficient ETH for gas fees
   - Ensure you're not trying to buy your own dataset
   - Verify contract addresses are correct

3. **Data Not Loading**:
   - Check browser console for errors
   - Verify network connectivity
   - Ensure you're connected to Base mainnet

4. **UI Issues**:
   - Clear browser cache
   - Disable browser extensions that might interfere
   - Try a different browser

### Debug Mode

Enable debug mode by opening browser console and running:

```javascript
localStorage.setItem('debug', 'true');
location.reload();
```

## 📞 Support

For technical support or questions:

1. Check the browser console for error messages
2. Verify your wallet connection and network
3. Ensure you have the latest version of the frontend
4. Check that smart contracts are deployed and accessible

## 🔄 Updates

To update the frontend:

1. Download the latest version of the files
2. Replace existing files (backup your customizations first)
3. Clear browser cache
4. Test functionality with a small transaction

## 📄 License

This frontend is part of the Dataset Marketplace project. Please refer to the main project license for usage terms.

---

**Built with ❤️ for the decentralized web**

*Base Network • Web3 • Smart Contracts • Modern UI*
