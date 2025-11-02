const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("🚀 Starting Dataset Marketplace deployment to Base Sepolia...\n");

  // Get deployment configuration from environment variables
  const platformWallet = process.env.PLATFORM_WALLET;
  const platformFeePercentage = process.env.PLATFORM_FEE_PERCENTAGE || "250"; // 2.5% default
  const initialOwner = process.env.INITIAL_OWNER;

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📋 Deployment Configuration:");
  console.log("├── Deployer address:", deployer.address);
  console.log("├── Platform wallet:", platformWallet || deployer.address);
  console.log("├── Platform fee:", platformFeePercentage, "basis points");
  console.log("├── Initial owner:", initialOwner || deployer.address);
  
  // Check deployer balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("├── Deployer balance:", ethers.formatEther(balance), "ETH");
  
  if (balance < ethers.parseEther("0.01")) {
    console.log("⚠️  Warning: Low balance. Make sure you have enough ETH for deployment.");
  }
  console.log("");

  // Use deployer address as fallback for missing environment variables
  const finalPlatformWallet = platformWallet || deployer.address;
  const finalInitialOwner = initialOwner || deployer.address;

  try {
    // Step 1: Deploy DatasetToken contract
    console.log("📦 Step 1: Deploying DatasetToken contract...");
    const DatasetToken = await ethers.getContractFactory("DatasetToken");
    const datasetToken = await DatasetToken.deploy(finalInitialOwner);
    await datasetToken.waitForDeployment();
    
    const datasetTokenAddress = await datasetToken.getAddress();
    console.log("✅ DatasetToken deployed to:", datasetTokenAddress);
    
    // Step 2: Deploy DatasetAccess contract
    console.log("\n📦 Step 2: Deploying DatasetAccess contract...");
    const DatasetAccess = await ethers.getContractFactory("DatasetAccess");
    const datasetAccess = await DatasetAccess.deploy(
      datasetTokenAddress,
      finalPlatformWallet,
      platformFeePercentage,
      finalInitialOwner
    );
    await datasetAccess.waitForDeployment();
    
    const datasetAccessAddress = await datasetAccess.getAddress();
    console.log("✅ DatasetAccess deployed to:", datasetAccessAddress);

    // Step 3: Grant MINTER_ROLE to DatasetAccess contract
    console.log("\n🔐 Step 3: Setting up permissions...");
    const MINTER_ROLE = await datasetToken.MINTER_ROLE();
    const BURNER_ROLE = await datasetToken.BURNER_ROLE();
    
    console.log("├── Granting MINTER_ROLE to DatasetAccess contract...");
    const grantMinterTx = await datasetToken.grantRole(MINTER_ROLE, datasetAccessAddress);
    await grantMinterTx.wait();
    console.log("✅ MINTER_ROLE granted");
    
    console.log("├── Granting BURNER_ROLE to DatasetAccess contract...");
    const grantBurnerTx = await datasetToken.grantRole(BURNER_ROLE, datasetAccessAddress);
    await grantBurnerTx.wait();
    console.log("✅ BURNER_ROLE granted");

    // Step 4: Verify deployment
    console.log("\n🔍 Step 4: Verifying deployment...");
    
    // Check DatasetToken
    const tokenName = await datasetToken.name();
    const tokenSymbol = await datasetToken.symbol();
    console.log("├── DatasetToken name:", tokenName);
    console.log("├── DatasetToken symbol:", tokenSymbol);
    
    // Check DatasetAccess
    const platformWalletCheck = await datasetAccess.platformWallet();
    const platformFeeCheck = await datasetAccess.platformFeePercentage();
    const ownerCheck = await datasetAccess.owner();
    
    console.log("├── Platform wallet:", platformWalletCheck);
    console.log("├── Platform fee:", platformFeeCheck.toString(), "basis points");
    console.log("├── Contract owner:", ownerCheck);

    // Check roles
    const hasMinterRole = await datasetToken.hasRole(MINTER_ROLE, datasetAccessAddress);
    const hasBurnerRole = await datasetToken.hasRole(BURNER_ROLE, datasetAccessAddress);
    console.log("├── DatasetAccess has MINTER_ROLE:", hasMinterRole);
    console.log("├── DatasetAccess has BURNER_ROLE:", hasBurnerRole);

    // Step 5: Save deployment information
    console.log("\n💾 Step 5: Saving deployment information...");
    
    const deploymentInfo = {
      network: "baseSepolia",
      chainId: 84532,
      timestamp: new Date().toISOString(),
      deployer: deployer.address,
      contracts: {
        DatasetToken: {
          address: datasetTokenAddress,
          name: tokenName,
          symbol: tokenSymbol
        },
        DatasetAccess: {
          address: datasetAccessAddress,
          platformWallet: platformWalletCheck,
          platformFeePercentage: platformFeeCheck.toString(),
          owner: ownerCheck
        }
      },
      configuration: {
        platformWallet: finalPlatformWallet,
        platformFeePercentage: platformFeePercentage,
        initialOwner: finalInitialOwner
      },
      gasUsed: {
        // Will be populated by actual deployment
      }
    };

    // Write to file
    const fs = require("fs");
    const path = require("path");
    
    const deploymentsDir = path.join(__dirname, "..", "deployments");
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir);
    }
    
    const deploymentFile = path.join(deploymentsDir, `baseSepolia-${Date.now()}.json`);
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
    
    console.log("✅ Deployment info saved to:", deploymentFile);

    // Step 6: Display summary
    console.log("\n🎉 Deployment Summary:");
    console.log("═══════════════════════════════════════════════════════════════");
    console.log("📋 Network: Base Sepolia (Chain ID: 84532)");
    console.log("📋 Deployer:", deployer.address);
    console.log("");
    console.log("📦 Contracts Deployed:");
    console.log("├── DatasetToken:", datasetTokenAddress);
    console.log("└── DatasetAccess:", datasetAccessAddress);
    console.log("");
    console.log("⚙️  Configuration:");
    console.log("├── Platform Wallet:", finalPlatformWallet);
    console.log("├── Platform Fee:", platformFeePercentage, "basis points");
    console.log("└── Owner:", finalInitialOwner);
    console.log("");
    console.log("🔗 Next Steps:");
    console.log("1. Verify contracts on BaseScan:");
    console.log("   npm run verify");
    console.log("");
    console.log("2. Test the deployment:");
    console.log("   npm run test");
    console.log("");
    console.log("3. Update your frontend with the contract addresses:");
    console.log("   DatasetToken:", datasetTokenAddress);
    console.log("   DatasetAccess:", datasetAccessAddress);
    console.log("═══════════════════════════════════════════════════════════════");

    return {
      datasetToken: datasetTokenAddress,
      datasetAccess: datasetAccessAddress
    };

  } catch (error) {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }
}

// Execute deployment
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("❌ Deployment script failed:", error);
      process.exit(1);
    });
}

module.exports = main;
