const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("DatasetToken", function () {
  let DatasetToken;
  let datasetToken;
  let owner;
  let minter;
  let user1;
  let user2;
  let addrs;

  const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
  const BURNER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("BURNER_ROLE"));
  const PAUSER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("PAUSER_ROLE"));

  beforeEach(async function () {
    [owner, minter, user1, user2, ...addrs] = await ethers.getSigners();

    DatasetToken = await ethers.getContractFactory("DatasetToken");
    datasetToken = await DatasetToken.deploy(owner.address);
    await datasetToken.waitForDeployment();

    // Grant minter role to minter account
    await datasetToken.grantRole(MINTER_ROLE, minter.address);
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await datasetToken.hasRole(await datasetToken.DEFAULT_ADMIN_ROLE(), owner.address)).to.be.true;
    });

    it("Should set correct name and symbol", async function () {
      expect(await datasetToken.name()).to.equal("Dataset Marketplace Token");
      expect(await datasetToken.symbol()).to.equal("DMT");
    });

    it("Should start token counter at 1", async function () {
      expect(await datasetToken.getCurrentTokenId()).to.equal(1);
    });

    it("Should grant initial roles to owner", async function () {
      expect(await datasetToken.hasRole(MINTER_ROLE, owner.address)).to.be.true;
      expect(await datasetToken.hasRole(PAUSER_ROLE, owner.address)).to.be.true;
      expect(await datasetToken.hasRole(BURNER_ROLE, owner.address)).to.be.true;
    });
  });

  describe("Dataset Token Minting", function () {
    it("Should mint dataset token successfully", async function () {
      const datasetId = 1;
      const metadataURI = "ipfs://QmTest123";

      await expect(datasetToken.connect(minter).mintDatasetToken(user1.address, datasetId, metadataURI))
        .to.emit(datasetToken, "DatasetTokenMinted")
        .withArgs(1, datasetId, user1.address, 0, metadataURI); // 0 = OWNERSHIP type

      expect(await datasetToken.ownerOf(1)).to.equal(user1.address);
      expect(await datasetToken.tokenURI(1)).to.equal(metadataURI);
    });

    it("Should set correct token info for dataset token", async function () {
      const datasetId = 1;
      const metadataURI = "ipfs://QmTest123";

      await datasetToken.connect(minter).mintDatasetToken(user1.address, datasetId, metadataURI);

      const tokenInfo = await datasetToken.tokenInfo(1);
      expect(tokenInfo.datasetId).to.equal(datasetId);
      expect(tokenInfo.tokenType).to.equal(0); // OWNERSHIP
      expect(tokenInfo.expiryTime).to.equal(0);
      expect(tokenInfo.transferable).to.be.true;
      expect(tokenInfo.originalOwner).to.equal(user1.address);
    });

    it("Should update user and dataset token arrays", async function () {
      const datasetId = 1;
      const metadataURI = "ipfs://QmTest123";

      await datasetToken.connect(minter).mintDatasetToken(user1.address, datasetId, metadataURI);

      const userTokens = await datasetToken.getUserTokens(user1.address);
      const datasetTokens = await datasetToken.getDatasetTokens(datasetId);

      expect(userTokens).to.deep.equal([1n]);
      expect(datasetTokens).to.deep.equal([1n]);
    });

    it("Should fail if not minter role", async function () {
      await expect(
        datasetToken.connect(user1).mintDatasetToken(user1.address, 1, "ipfs://test")
      ).to.be.revertedWithCustomError(datasetToken, "AccessControlUnauthorizedAccount");
    });

    it("Should fail when paused", async function () {
      await datasetToken.pause();
      
      await expect(
        datasetToken.connect(minter).mintDatasetToken(user1.address, 1, "ipfs://test")
      ).to.be.revertedWithCustomError(datasetToken, "EnforcedPause");
    });
  });

  describe("Access Token Minting", function () {
    it("Should mint access token successfully", async function () {
      const datasetId = 1;
      const expiryTime = (await time.latest()) + 3600; // 1 hour from now
      const metadataURI = "ipfs://QmAccess123";

      await expect(
        datasetToken.connect(minter).mintAccessToken(
          user1.address,
          datasetId,
          expiryTime,
          user2.address,
          metadataURI
        )
      ).to.emit(datasetToken, "AccessTokenMinted")
        .withArgs(1, datasetId, user1.address, user2.address, expiryTime);

      expect(await datasetToken.ownerOf(1)).to.equal(user1.address);
      expect(await datasetToken.tokenURI(1)).to.equal(metadataURI);
    });

    it("Should set correct token info for access token", async function () {
      const datasetId = 1;
      const expiryTime = (await time.latest()) + 3600;
      const metadataURI = "ipfs://QmAccess123";

      await datasetToken.connect(minter).mintAccessToken(
        user1.address,
        datasetId,
        expiryTime,
        user2.address,
        metadataURI
      );

      const tokenInfo = await datasetToken.tokenInfo(1);
      expect(tokenInfo.datasetId).to.equal(datasetId);
      expect(tokenInfo.tokenType).to.equal(1); // ACCESS
      expect(tokenInfo.expiryTime).to.equal(expiryTime);
      expect(tokenInfo.transferable).to.be.false;
      expect(tokenInfo.originalOwner).to.equal(user2.address);
    });

    it("Should fail if expiry time is in the past", async function () {
      const pastTime = (await time.latest()) - 3600;

      await expect(
        datasetToken.connect(minter).mintAccessToken(
          user1.address,
          1,
          pastTime,
          user2.address,
          "ipfs://test"
        )
      ).to.be.revertedWith("Expiry time must be in the future");
    });

    it("Should fail if minting to dataset owner", async function () {
      const expiryTime = (await time.latest()) + 3600;

      await expect(
        datasetToken.connect(minter).mintAccessToken(
          user1.address,
          1,
          expiryTime,
          user1.address, // Same as recipient
          "ipfs://test"
        )
      ).to.be.revertedWith("Cannot mint access token to dataset owner");
    });
  });

  describe("Access Validation", function () {
    let datasetTokenId;
    let accessTokenId;
    let expiredAccessTokenId;

    beforeEach(async function () {
      // Mint dataset token
      await datasetToken.connect(minter).mintDatasetToken(user1.address, 1, "ipfs://dataset");
      datasetTokenId = 1;

      // Mint valid access token
      const futureTime = (await time.latest()) + 3600;
      await datasetToken.connect(minter).mintAccessToken(
        user2.address,
        1,
        futureTime,
        user1.address,
        "ipfs://access"
      );
      accessTokenId = 2;

      // Mint expired access token
      const pastTime = (await time.latest()) + 1;
      await datasetToken.connect(minter).mintAccessToken(
        user2.address,
        1,
        pastTime,
        user1.address,
        "ipfs://expired"
      );
      expiredAccessTokenId = 3;

      // Move time forward to expire the token
      await time.increase(2);
    });

    it("Should validate ownership token access", async function () {
      expect(await datasetToken.hasValidAccess(datasetTokenId)).to.be.true;
    });

    it("Should validate unexpired access token", async function () {
      expect(await datasetToken.hasValidAccess(accessTokenId)).to.be.true;
    });

    it("Should invalidate expired access token", async function () {
      expect(await datasetToken.hasValidAccess(expiredAccessTokenId)).to.be.false;
    });

    it("Should return false for non-existent token", async function () {
      expect(await datasetToken.hasValidAccess(999)).to.be.false;
    });

    it("Should return correct access details", async function () {
      const [datasetId, tokenType, expiryTime, isValid] = await datasetToken.getAccessDetails(accessTokenId);
      
      expect(datasetId).to.equal(1);
      expect(tokenType).to.equal(1); // ACCESS
      expect(expiryTime).to.be.gt(await time.latest());
      expect(isValid).to.be.true;
    });
  });

  describe("Token Burning", function () {
    let accessTokenId;
    let expiredTokenId;

    beforeEach(async function () {
      // Mint access token
      const futureTime = (await time.latest()) + 3600;
      await datasetToken.connect(minter).mintAccessToken(
        user1.address,
        1,
        futureTime,
        user2.address,
        "ipfs://access"
      );
      accessTokenId = 1;

      // Mint expired token
      const pastTime = (await time.latest()) + 1;
      await datasetToken.connect(minter).mintAccessToken(
        user1.address,
        1,
        pastTime,
        user2.address,
        "ipfs://expired"
      );
      expiredTokenId = 2;

      await time.increase(2);
    });

    it("Should burn expired token by owner", async function () {
      await expect(datasetToken.connect(user1).burnExpiredToken(expiredTokenId))
        .to.emit(datasetToken, "TokenBurned")
        .withArgs(expiredTokenId, 1);

      await expect(datasetToken.ownerOf(expiredTokenId))
        .to.be.revertedWithCustomError(datasetToken, "ERC721NonexistentToken");
    });

    it("Should burn expired token by original owner", async function () {
      await expect(datasetToken.connect(user2).burnExpiredToken(expiredTokenId))
        .to.emit(datasetToken, "TokenBurned")
        .withArgs(expiredTokenId, 1);
    });

    it("Should fail to burn non-expired token", async function () {
      await expect(
        datasetToken.connect(user1).burnExpiredToken(accessTokenId)
      ).to.be.revertedWith("Token not yet expired");
    });

    it("Should fail to burn ownership token", async function () {
      // Mint ownership token
      await datasetToken.connect(minter).mintDatasetToken(user1.address, 2, "ipfs://dataset");
      
      await expect(
        datasetToken.connect(user1).burnExpiredToken(3)
      ).to.be.revertedWith("Can only burn access tokens");
    });

    it("Should force burn token with burner role", async function () {
      await datasetToken.grantRole(BURNER_ROLE, user2.address);
      
      await expect(datasetToken.connect(user2).forceBurn(accessTokenId))
        .to.emit(datasetToken, "TokenBurned")
        .withArgs(accessTokenId, 1);
    });

    it("Should clean up arrays when burning", async function () {
      // Check arrays before burning
      let userTokens = await datasetToken.getUserTokens(user1.address);
      let datasetTokens = await datasetToken.getDatasetTokens(1);
      
      expect(userTokens.length).to.equal(2);
      expect(datasetTokens.length).to.equal(2);

      // Burn token
      await datasetToken.connect(user1).burnExpiredToken(expiredTokenId);

      // Check arrays after burning
      userTokens = await datasetToken.getUserTokens(user1.address);
      datasetTokens = await datasetToken.getDatasetTokens(1);
      
      expect(userTokens.length).to.equal(1);
      expect(datasetTokens.length).to.equal(1);
    });
  });

  describe("Transfer Controls", function () {
    let ownershipTokenId;
    let accessTokenId;

    beforeEach(async function () {
      // Mint ownership token (transferable)
      await datasetToken.connect(minter).mintDatasetToken(user1.address, 1, "ipfs://dataset");
      ownershipTokenId = 1;

      // Mint access token (non-transferable)
      const futureTime = (await time.latest()) + 3600;
      await datasetToken.connect(minter).mintAccessToken(
        user1.address,
        1,
        futureTime,
        user2.address,
        "ipfs://access"
      );
      accessTokenId = 2;
    });

    it("Should allow transfer of ownership tokens", async function () {
      await datasetToken.connect(user1).transferFrom(user1.address, user2.address, ownershipTokenId);
      expect(await datasetToken.ownerOf(ownershipTokenId)).to.equal(user2.address);
    });

    it("Should prevent transfer of access tokens", async function () {
      await expect(
        datasetToken.connect(user1).transferFrom(user1.address, user2.address, accessTokenId)
      ).to.be.revertedWith("Token is not transferable");
    });

    it("Should update user arrays on transfer", async function () {
      // Transfer ownership token
      await datasetToken.connect(user1).transferFrom(user1.address, user2.address, ownershipTokenId);

      const user1Tokens = await datasetToken.getUserTokens(user1.address);
      const user2Tokens = await datasetToken.getUserTokens(user2.address);

      expect(user1Tokens).to.deep.equal([accessTokenId]); // Only access token remains
      expect(user2Tokens).to.deep.equal([ownershipTokenId]); // Ownership token transferred
    });

    it("Should allow admin to change transferability", async function () {
      await datasetToken.setTokenTransferability(accessTokenId, true);
      
      // Should now be transferable
      await datasetToken.connect(user1).transferFrom(user1.address, user2.address, accessTokenId);
      expect(await datasetToken.ownerOf(accessTokenId)).to.equal(user2.address);
    });
  });

  describe("Pause Functionality", function () {
    it("Should pause and unpause contract", async function () {
      await datasetToken.pause();
      expect(await datasetToken.paused()).to.be.true;

      await datasetToken.unpause();
      expect(await datasetToken.paused()).to.be.false;
    });

    it("Should prevent minting when paused", async function () {
      await datasetToken.pause();

      await expect(
        datasetToken.connect(minter).mintDatasetToken(user1.address, 1, "ipfs://test")
      ).to.be.revertedWithCustomError(datasetToken, "EnforcedPause");
    });

    it("Should prevent transfers when paused", async function () {
      // Mint token first
      await datasetToken.connect(minter).mintDatasetToken(user1.address, 1, "ipfs://test");
      
      // Pause contract
      await datasetToken.pause();

      await expect(
        datasetToken.connect(user1).transferFrom(user1.address, user2.address, 1)
      ).to.be.revertedWithCustomError(datasetToken, "EnforcedPause");
    });

    it("Should fail if non-pauser tries to pause", async function () {
      await expect(
        datasetToken.connect(user1).pause()
      ).to.be.revertedWithCustomError(datasetToken, "AccessControlUnauthorizedAccount");
    });
  });

  describe("Role Management", function () {
    it("Should grant and revoke roles", async function () {
      // Grant minter role to user1
      await datasetToken.grantRole(MINTER_ROLE, user1.address);
      expect(await datasetToken.hasRole(MINTER_ROLE, user1.address)).to.be.true;

      // Revoke minter role from user1
      await datasetToken.revokeRole(MINTER_ROLE, user1.address);
      expect(await datasetToken.hasRole(MINTER_ROLE, user1.address)).to.be.false;
    });

    it("Should fail role operations from non-admin", async function () {
      await expect(
        datasetToken.connect(user1).grantRole(MINTER_ROLE, user2.address)
      ).to.be.revertedWithCustomError(datasetToken, "AccessControlUnauthorizedAccount");
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      // Create some test data
      await datasetToken.connect(minter).mintDatasetToken(user1.address, 1, "ipfs://dataset1");
      await datasetToken.connect(minter).mintDatasetToken(user1.address, 2, "ipfs://dataset2");
      
      const futureTime = (await time.latest()) + 3600;
      await datasetToken.connect(minter).mintAccessToken(
        user2.address,
        1,
        futureTime,
        user1.address,
        "ipfs://access"
      );
    });

    it("Should return correct user tokens", async function () {
      const user1Tokens = await datasetToken.getUserTokens(user1.address);
      const user2Tokens = await datasetToken.getUserTokens(user2.address);

      expect(user1Tokens.length).to.equal(2);
      expect(user2Tokens.length).to.equal(1);
    });

    it("Should return correct dataset tokens", async function () {
      const dataset1Tokens = await datasetToken.getDatasetTokens(1);
      const dataset2Tokens = await datasetToken.getDatasetTokens(2);

      expect(dataset1Tokens.length).to.equal(2); // 1 ownership + 1 access
      expect(dataset2Tokens.length).to.equal(1); // 1 ownership only
    });

    it("Should return current token ID", async function () {
      expect(await datasetToken.getCurrentTokenId()).to.equal(4); // Next token ID
    });
  });

  describe("Edge Cases", function () {
    it("Should handle multiple tokens for same dataset", async function () {
      const datasetId = 1;
      
      // Mint ownership token
      await datasetToken.connect(minter).mintDatasetToken(user1.address, datasetId, "ipfs://dataset");
      
      // Mint multiple access tokens
      const futureTime = (await time.latest()) + 3600;
      await datasetToken.connect(minter).mintAccessToken(
        user2.address,
        datasetId,
        futureTime,
        user1.address,
        "ipfs://access1"
      );
      await datasetToken.connect(minter).mintAccessToken(
        addrs[0].address,
        datasetId,
        futureTime,
        user1.address,
        "ipfs://access2"
      );

      const datasetTokens = await datasetToken.getDatasetTokens(datasetId);
      expect(datasetTokens.length).to.equal(3);
    });

    it("Should handle empty arrays correctly", async function () {
      const emptyUserTokens = await datasetToken.getUserTokens(user1.address);
      const emptyDatasetTokens = await datasetToken.getDatasetTokens(1);

      expect(emptyUserTokens.length).to.equal(0);
      expect(emptyDatasetTokens.length).to.equal(0);
    });

    it("Should revert on invalid token queries", async function () {
      await expect(
        datasetToken.getAccessDetails(999)
      ).to.be.revertedWith("Token does not exist");

      await expect(
        datasetToken.burnExpiredToken(999)
      ).to.be.revertedWith("Token does not exist");
    });
  });
});
