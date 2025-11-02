const { run } = require("hardhat");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

async function main() {
  console.log("🔍 Starting contract verification on BaseScan...\n");

  // Find the latest deployment file
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  
  if (!fs.existsSync(deploymentsDir)) {
    console.error("❌ No deployments directory found. Please deploy contracts first.");
    process.exit(1);
  }

  const deploymentFiles = fs.readdirSync(deploymentsDir)
    .filter(file => file.startsWith("baseSepolia-") && file.endsWith(".json"))
    .sort()
    .reverse();

  if (deploymentFiles.length === 0) {
    console.error("❌ No Base Sepolia deployment files found. Please deploy contracts first.");
    process.exit(1);
  }

  const latestDeploymentFile = path.join(deploymentsDir, deploymentFiles[0]);
  console.log("📋 Using deployment file:", deploymentFiles[0]);

  let deploymentInfo;
  try {
    deploymentInfo = JSON.parse(fs.readFileSync(latestDeploymentFile, "utf8"));
  } catch (error) {
    console.error("❌ Failed to read deployment file:", error.message);
    process.exit(1);
  }

  const { contracts, configuration } = deploymentInfo;

  if (!contracts || !contracts.DatasetToken || !contracts.DatasetAccess) {
    console.error("❌ Invalid deployment file format. Missing contract addresses.");
    process.exit(1);
  }

  console.log("📦 Contracts to verify:");
  console.log("├── DatasetToken:", contracts.DatasetToken.address);
  console.log("└── DatasetAccess:", contracts.DatasetAccess.address);
  console.log("");

  try {
    // Verify DatasetToken contract
    console.log("🔍 Step 1: Verifying DatasetToken contract...");
    
    await run("verify:verify", {
      address: contracts.DatasetToken.address,
      constructorArguments: [
        configuration.initialOwner
      ],
      contract: "contracts/DatasetToken.sol:DatasetToken"
    });
    
    console.log("✅ DatasetToken verified successfully!");

    // Verify DatasetAccess contract
    console.log("\n🔍 Step 2: Verifying DatasetAccess contract...");
    
    await run("verify:verify", {
      address: contracts.DatasetAccess.address,
      constructorArguments: [
        contracts.DatasetToken.address,
        configuration.platformWallet,
        configuration.platformFeePercentage,
        configuration.initialOwner
      ],
      contract: "contracts/DatasetAccess.sol:DatasetAccess"
    });
    
    console.log("✅ DatasetAccess verified successfully!");

    // Update deployment file with verification status
    deploymentInfo.verified = true;
    deploymentInfo.verificationTimestamp = new Date().toISOString();
    
    fs.writeFileSync(latestDeploymentFile, JSON.stringify(deploymentInfo, null, 2));
    console.log("✅ Deployment file updated with verification status");

    // Display verification summary
    console.log("\n🎉 Verification Summary:");
    console.log("═══════════════════════════════════════════════════════════════");
    console.log("📋 Network: Base Sepolia");
    console.log("");
    console.log("✅ Verified Contracts:");
    console.log("├── DatasetToken:", contracts.DatasetToken.address);
    console.log("└── DatasetAccess:", contracts.DatasetAccess.address);
    console.log("");
    console.log("🔗 View on BaseScan:");
    console.log("├── DatasetToken: https://sepolia.basescan.org/address/" + contracts.DatasetToken.address);
    console.log("└── DatasetAccess: https://sepolia.basescan.org/address/" + contracts.DatasetAccess.address);
    console.log("═══════════════════════════════════════════════════════════════");

  } catch (error) {
    if (error.message.includes("Already Verified")) {
      console.log("ℹ️  Contracts are already verified on BaseScan");
      
      // Update deployment file
      deploymentInfo.verified = true;
      deploymentInfo.verificationTimestamp = new Date().toISOString();
      fs.writeFileSync(latestDeploymentFile, JSON.stringify(deploymentInfo, null, 2));
      
    } else {
      console.error("❌ Verification failed:", error.message);
      
      // Common error messages and solutions
      if (error.message.includes("NOTOK")) {
        console.log("\n💡 Troubleshooting tips:");
        console.log("1. Make sure BASESCAN_API_KEY is set in your .env file");
        console.log("2. Wait a few minutes after deployment before verifying");
        console.log("3. Check that the contract addresses are correct");
      }
      
      process.exit(1);
    }
  }
}

// Execute verification
if (require.main === module) {
  main()
    .then(() => {
      console.log("\n✅ Verification completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Verification script failed:", error);
      process.exit(1);
    });
}

module.exports = main;
