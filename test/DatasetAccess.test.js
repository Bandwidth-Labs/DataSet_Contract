const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("DatasetAccess", function () {
  let DatasetToken;
  let DatasetAccess;
  let datasetToken;
  let datasetAccess;
  let owner;
  let platformWallet;
  let user1;
  let user2;
  let user3;
  let addrs;

  const PLATFORM_FEE = 250; // 2.5%
  const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
  const BURNER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("BURNER_ROLE"));

  beforeEach(async function () {
    [owner, platformWallet, user1, user2, user3, ...addrs] = await ethers.getSigners();

    // Deploy DatasetToken
    DatasetToken = await ethers.getContractFactory("DatasetToken");
    datasetToken = await DatasetToken.deploy(owner.address);
    await datasetToken.waitForDeployment();

    // Deploy DatasetAccess
    DatasetAccess = await ethers.getContractFactory("DatasetAccess");
    datasetAccess = await DatasetAccess.deploy(
      await datasetToken.getAddress(),
      platformWallet.address,
      PLATFORM_FEE,
      owner.address
    );
    await datasetAccess.waitForDeployment();

    // Grant roles to DatasetAccess contract
    await datasetToken.grantRole(MINTER_ROLE, await datasetAccess.getAddress());
    await datasetToken.grantRole(BURNER_ROLE, await datasetAccess.getAddress());
  });

  describe("Deployment", function () {
    it("Should set correct initial values", async function () {
      expect(await datasetAccess.owner()).to.equal(owner.address);
      expect(await datasetAccess.platformWallet()).to.equal(platformWallet.address);
      expect(await datasetAccess.platformFeePercentage()).to.equal(PLATFORM_FEE);
      expect(await datasetAccess.getCurrentDatasetId()).to.equal(1);
    });

    it("Should fail with invalid parameters", async function () {
      await expect(
        DatasetAccess.deploy(ethers.ZeroAddress, platformWallet.address, PLATFORM_FEE, owner.address)
      ).to.be.revertedWith("Invalid token contract address");

      await expect(
        DatasetAccess.deploy(await datasetToken.getAddress(), ethers.ZeroAddress, PLATFORM_FEE, owner.address)
      ).to.be.revertedWith("Invalid platform wallet");

      await expect(
        DatasetAccess.deploy(await datasetToken.getAddress(), platformWallet.address, 1001, owner.address)
      ).to.be.revertedWith("Platform fee too high");
    });
  });

  describe("Dataset Creation", function () {
    const prices = [
      ethers.parseEther("0.01"), // 1 hour
      ethers.parseEther("0.05"), // 24 hours
      ethers.parseEther("0.2"),  // 7 days
      ethers.parseEther("0.5"),  // 30 days
      ethers.parseEther("1.0"),  // 90 days
      ethers.parseEther("2.0")   // 365 days
    ];

    it("Should create dataset successfully", async function () {
      const metadataURI = "ipfs://QmDataset123";

      await expect(datasetAccess.connect(user1).createDataset(metadataURI, prices))
        .to.emit(datasetAccess, "DatasetCreated")
        .withArgs(1, user1.address, metadataURI, await time.latest() + 1);

      const dataset = await datasetAccess.getDataset(1);
      expect(dataset.owner).to.equal(user1.address);
      expect(dataset.metadataURI).to.equal(metadataURI);
      expect(dataset.isActive).to.be.true;
    });

    it("Should mint ownership NFT on dataset creation", async function () {
      await datasetAccess.connect(user1).createDataset("ipfs://test", prices);
      
      const userTokens = await datasetToken.getUserTokens(user1.address);
      expect(userTokens.length).to.equal(1);
      expect(await datasetToken.ownerOf(userTokens[0])).to.equal(user1.address);
    });

    it("Should fail with empty metadata URI", async function () {
      await expect(
        datasetAccess.connect(user1).createDataset("", prices)
      ).to.be.revertedWith("Metadata URI cannot be empty");
    });

    it("Should fail when paused", async function () {
      await datasetAccess.pause();
      
      await expect(
        datasetAccess.connect(user1).createDataset("ipfs://test", prices)
      ).to.be.revertedWithCustomError(datasetAccess, "EnforcedPause");
    });
  });

  describe("Dataset Updates", function () {
    let datasetId;
    const initialPrices = [
      ethers.parseEther("0.01"), ethers.parseEther("0.05"), ethers.parseEther("0.2"),
      ethers.parseEther("0.5"), ethers.parseEther("1.0"), ethers.parseEther("2.0")
    ];

    beforeEach(async function () {
      await datasetAccess.connect(user1).createDataset("ipfs://initial", initialPrices);
      datasetId = 1;
    });

    it("Should update dataset successfully", async function () {
      const newMetadataURI = "ipfs://updated";
      const newPrices = initialPrices.map(p => p * 2n);

      await expect(datasetAccess.connect(user1).updateDataset(datasetId, newMetadataURI, newPrices))
        .to.emit(datasetAccess, "DatasetUpdated")
        .withArgs(datasetId, newMetadataURI, await time.latest() + 1);

      const dataset = await datasetAccess.getDataset(datasetId);
      expect(dataset.metadataURI).to.equal(newMetadataURI);
      expect(dataset.prices[0]).to.equal(newPrices[0]);
    });

    it("Should emit price update events", async function () {
      const newPrices = [...initialPrices];
      newPrices[0] = ethers.parseEther("0.02"); // Change first price

      await expect(datasetAccess.connect(user1).updateDataset(datasetId, "ipfs://test", newPrices))
        .to.emit(datasetAccess, "PriceUpdated")
        .withArgs(datasetId, 0, initialPrices[0], newPrices[0]);
    });

    it("Should fail if not owner", async function () {
      await expect(
        datasetAccess.connect(user2).updateDataset(datasetId, "ipfs://test", initialPrices)
      ).to.be.revertedWith("Not dataset owner");
    });

    it("Should fail with non-existent dataset", async function () {
      await expect(
        datasetAccess.connect(user1).updateDataset(999, "ipfs://test", initialPrices)
      ).to.be.revertedWith("Dataset does not exist");
    });
  });

  describe("Access Purchase", function () {
    let datasetId;
    const prices = [
      ethers.parseEther("0.01"), ethers.parseEther("0.05"), ethers.parseEther("0.2"),
      ethers.parseEther("0.5"), ethers.parseEther("1.0"), ethers.parseEther("2.0")
    ];

    beforeEach(async function () {
      await datasetAccess.connect(user1).createDataset("ipfs://dataset", prices);
      datasetId = 1;
    });

    it("Should purchase access successfully", async function () {
      const duration = 1; // 24 hours
      const price = prices[duration];

      await expect(
        datasetAccess.connect(user2).purchaseAccess(datasetId, duration, { value: price })
      ).to.emit(datasetAccess, "AccessPurchased");

      expect(await datasetAccess.checkAccess(user2.address, datasetId)).to.be.true;
    });

    it("Should mint access token on purchase", async function () {
      const duration = 1;
      const price = prices[duration];

      await datasetAccess.connect(user2).purchaseAccess(datasetId, duration, { value: price });

      const userTokens = await datasetToken.getUserTokens(user2.address);
      expect(userTokens.length).to.equal(1);
      
      const [tokenDatasetId, tokenType, , isValid] = await datasetToken.getAccessDetails(userTokens[0]);
      expect(tokenDatasetId).to.equal(datasetId);
      expect(tokenType).to.equal(1); // ACCESS type
      expect(isValid).to.be.true;
    });

    it("Should distribute payments correctly", async function () {
      const duration = 1;
      const price = prices[duration];
      
      const platformBalanceBefore = await ethers.provider.getBalance(platformWallet.address);
      const ownerBalanceBefore = await ethers.provider.getBalance(user1.address);

      await datasetAccess.connect(user2).purchaseAccess(datasetId, duration, { value: price });

      const platformBalanceAfter = await ethers.provider.getBalance(platformWallet.address);
      const ownerBalanceAfter = await ethers.provider.getBalance(user1.address);

      const platformFee = (price * BigInt(PLATFORM_FEE)) / 10000n;
      const ownerAmount = price - platformFee;

      expect(platformBalanceAfter - platformBalanceBefore).to.equal(platformFee);
      expect(ownerBalanceAfter - ownerBalanceBefore).to.equal(ownerAmount);
    });

    it("Should refund excess payment", async function () {
      const duration = 1;
      const price = prices[duration];
      const excess = ethers.parseEther("0.1");

      const balanceBefore = await ethers.provider.getBalance(user2.address);
      const tx = await datasetAccess.connect(user2).purchaseAccess(datasetId, duration, { value: price + excess });
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      const balanceAfter = await ethers.provider.getBalance(user2.address);

      expect(balanceBefore - balanceAfter).to.equal(price + gasUsed);
    });

    it("Should fail with insufficient payment", async function () {
      const duration = 1;
      const price = prices[duration];

      await expect(
        datasetAccess.connect(user2).purchaseAccess(datasetId, duration, { value: price - 1n })
      ).to.be.revertedWith("Insufficient payment");
    });

    it("Should fail if owner tries to purchase own dataset", async function () {
      const duration = 1;
      const price = prices[duration];

      await expect(
        datasetAccess.connect(user1).purchaseAccess(datasetId, duration, { value: price })
      ).to.be.revertedWith("Cannot purchase own dataset");
    });

    it("Should fail if dataset is inactive", async function () {
      await datasetAccess.emergencyToggleDataset(datasetId);
      
      const duration = 1;
      const price = prices[duration];

      await expect(
        datasetAccess.connect(user2).purchaseAccess(datasetId, duration, { value: price })
      ).to.be.revertedWith("Dataset is not active");
    });
  });

  describe("Access Control", function () {
    let datasetId;
    const prices = [ethers.parseEther("0.01"), ethers.parseEther("0.05"), ethers.parseEther("0.2"), ethers.parseEther("0.5"), ethers.parseEther("1.0"), ethers.parseEther("2.0")];

    beforeEach(async function () {
      await datasetAccess.connect(user1).createDataset("ipfs://dataset", prices);
      datasetId = 1;
    });

    it("Should grant access to dataset owner", async function () {
      expect(await datasetAccess.checkAccess(user1.address, datasetId)).to.be.true;
    });

    it("Should grant access to purchaser", async function () {
      const duration = 1;
      const price = prices[duration];

      await datasetAccess.connect(user2).purchaseAccess(datasetId, duration, { value: price });
      expect(await datasetAccess.checkAccess(user2.address, datasetId)).to.be.true;
    });

    it("Should deny access to non-purchaser", async function () {
      expect(await datasetAccess.checkAccess(user2.address, datasetId)).to.be.false;
    });

    it("Should return correct access details", async function () {
      const duration = 1;
      const price = prices[duration];

      await datasetAccess.connect(user2).purchaseAccess(datasetId, duration, { value: price });
      
      const [hasAccess, expiryTime, tokenId] = await datasetAccess.getAccessDetails(user2.address, datasetId);
      expect(hasAccess).to.be.true;
      expect(expiryTime).to.be.gt(await time.latest());
      expect(tokenId).to.be.gt(0);
    });

    it("Should revoke access", async function () {
      const duration = 1;
      const price = prices[duration];

      await datasetAccess.connect(user2).purchaseAccess(datasetId, duration, { value: price });
      
      await expect(datasetAccess.connect(user1).revokeAccess(datasetId, user2.address))
        .to.emit(datasetAccess, "AccessRevoked");

      expect(await datasetAccess.checkAccess(user2.address, datasetId)).to.be.false;
    });

    it("Should fail revoke if not authorized", async function () {
      await expect(
        datasetAccess.connect(user2).revokeAccess(datasetId, user1.address)
      ).to.be.revertedWith("Not authorized to revoke access");
    });
  });

  describe("Royalty System", function () {
    let datasetId;
    const prices = [ethers.parseEther("0.01"), ethers.parseEther("0.05"), ethers.parseEther("0.2"), ethers.parseEther("0.5"), ethers.parseEther("1.0"), ethers.parseEther("2.0")];

    beforeEach(async function () {
      await datasetAccess.connect(user1).createDataset("ipfs://dataset", prices);
      datasetId = 1;
    });

    it("Should set royalties successfully", async function () {
      const recipients = [user2.address, user3.address];
      const percentages = [300, 200]; // 3% and 2%

      await expect(datasetAccess.connect(user1).setRoyalty(datasetId, recipients, percentages))
        .to.emit(datasetAccess, "RoyaltySet")
        .withArgs(datasetId, user2.address, 300);

      const [returnedRecipients, returnedPercentages] = await datasetAccess.getRoyalties(datasetId);
      expect(returnedRecipients).to.deep.equal(recipients);
      expect(returnedPercentages).to.deep.equal(percentages.map(p => BigInt(p)));
    });

    it("Should distribute royalties on purchase", async function () {
      const recipients = [user2.address];
      const percentages = [500]; // 5%
      
      await datasetAccess.connect(user1).setRoyalty(datasetId, recipients, percentages);

      const duration = 1;
      const price = prices[duration];
      
      const royaltyBalanceBefore = await ethers.provider.getBalance(user2.address);
      
      await datasetAccess.connect(user3).purchaseAccess(datasetId, duration, { value: price });
      
      const royaltyBalanceAfter = await ethers.provider.getBalance(user2.address);
      const expectedRoyalty = (price * 500n) / 10000n;
      
      expect(royaltyBalanceAfter - royaltyBalanceBefore).to.equal(expectedRoyalty);
    });

    it("Should fail with mismatched arrays", async function () {
      const recipients = [user2.address, user3.address];
      const percentages = [300]; // Mismatch

      await expect(
        datasetAccess.connect(user1).setRoyalty(datasetId, recipients, percentages)
      ).to.be.revertedWith("Arrays length mismatch");
    });

    it("Should fail with excessive royalty", async function () {
      const recipients = [user2.address];
      const percentages = [1001]; // > 10%

      await expect(
        datasetAccess.connect(user1).setRoyalty(datasetId, recipients, percentages)
      ).to.be.revertedWith("Total royalty exceeds maximum");
    });

    it("Should fail if not dataset owner", async function () {
      await expect(
        datasetAccess.connect(user2).setRoyalty(datasetId, [user3.address], [100])
      ).to.be.revertedWith("Not dataset owner");
    });
  });

  describe("Administrative Functions", function () {
    let datasetId;

    beforeEach(async function () {
      const prices = [ethers.parseEther("0.01"), ethers.parseEther("0.05"), ethers.parseEther("0.2"), ethers.parseEther("0.5"), ethers.parseEther("1.0"), ethers.parseEther("2.0")];
      await datasetAccess.connect(user1).createDataset("ipfs://dataset", prices);
      datasetId = 1;
    });

    it("Should toggle dataset status", async function () {
      await expect(datasetAccess.emergencyToggleDataset(datasetId))
        .to.emit(datasetAccess, "DatasetToggled")
        .withArgs(datasetId, false);

      const dataset = await datasetAccess.getDataset(datasetId);
      expect(dataset.isActive).to.be.false;
    });

    it("Should update platform fee", async function () {
      const newFee = 300; // 3%

      await expect(datasetAccess.updatePlatformFee(newFee))
        .to.emit(datasetAccess, "PlatformFeeUpdated")
        .withArgs(PLATFORM_FEE, newFee);

      expect(await datasetAccess.platformFeePercentage()).to.equal(newFee);
    });

    it("Should update platform wallet", async function () {
      await expect(datasetAccess.updatePlatformWallet(user3.address))
        .to.emit(datasetAccess, "PlatformWalletUpdated")
        .withArgs(platformWallet.address, user3.address);

      expect(await datasetAccess.platformWallet()).to.equal(user3.address);
    });

    it("Should fail admin functions from non-owner", async function () {
      await expect(
        datasetAccess.connect(user1).emergencyToggleDataset(datasetId)
      ).to.be.revertedWithCustomError(datasetAccess, "OwnableUnauthorizedAccount");

      await expect(
        datasetAccess.connect(user1).updatePlatformFee(300)
      ).to.be.revertedWithCustomError(datasetAccess, "OwnableUnauthorizedAccount");
    });

    it("Should emergency withdraw", async function () {
      // Send some ETH to contract
      await user1.sendTransaction({ to: await datasetAccess.getAddress(), value: ethers.parseEther("1.0") });

      const balanceBefore = await ethers.provider.getBalance(owner.address);
      await datasetAccess.emergencyWithdraw();
      const balanceAfter = await ethers.provider.getBalance(owner.address);

      expect(balanceAfter).to.be.gt(balanceBefore);
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      const prices = [ethers.parseEther("0.01"), ethers.parseEther("0.05"), ethers.parseEther("0.2"), ethers.parseEther("0.5"), ethers.parseEther("1.0"), ethers.parseEther("2.0")];
      await datasetAccess.connect(user1).createDataset("ipfs://dataset1", prices);
      await datasetAccess.connect(user1).createDataset("ipfs://dataset2", prices);
      await datasetAccess.connect(user2).purchaseAccess(1, 1, { value: prices[1] });
    });

    it("Should return user datasets", async function () {
      const userDatasets = await datasetAccess.getUserDatasets(user1.address);
      expect(userDatasets).to.deep.equal([1n, 2n]);
    });

    it("Should return user purchases", async function () {
      const userPurchases = await datasetAccess.getUserPurchases(user2.address);
      expect(userPurchases.length).to.equal(1);
    });

    it("Should return dataset information", async function () {
      const dataset = await datasetAccess.getDataset(1);
      expect(dataset.id).to.equal(1);
      expect(dataset.owner).to.equal(user1.address);
      expect(dataset.totalSales).to.equal(1);
    });
  });
});
