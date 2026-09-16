const { expect } = require("chai");
const { ethers } = require("hardhat");

const ONE = ethers.parseEther("1");

async function deployFixture() {
  const [owner, treasury, buyer, referrer, level2, stranger] = await ethers.getSigners();

  const Token = await ethers.getContractFactory("MytreeToken");
  const token = await Token.deploy(treasury.address, owner.address);
  const usdt = await Token.deploy(treasury.address, owner.address);
  await token.waitForDeployment();
  await usdt.waitForDeployment();

  const price = ethers.parseEther("0.0001");
  const min = ethers.parseEther("0.01");
  const max = ethers.parseEther("5");
  const roundCap = ethers.parseEther("100000");
  const rewardsCap = ethers.parseEther("50000");

  const Presale = await ethers.getContractFactory("MytreePresale");
  const presale = await Presale.deploy(
    await token.getAddress(),
    owner.address,
    price,
    min,
    max,
    roundCap,
    rewardsCap,
    await usdt.getAddress()
  );
  await presale.waitForDeployment();

  await token.connect(treasury).transfer(await presale.getAddress(), ethers.parseEther("150000"));
  await usdt.connect(treasury).transfer(buyer.address, ethers.parseEther("20"));
  await usdt.connect(treasury).transfer(referrer.address, ethers.parseEther("20"));
  await usdt.connect(treasury).transfer(level2.address, ethers.parseEther("20"));

  return { owner, treasury, buyer, referrer, level2, stranger, token, usdt, presale, price };
}

async function buy(usdt, presale, buyer, amount, referrer = ethers.ZeroAddress) {
  await usdt.connect(buyer).approve(await presale.getAddress(), amount);
  return presale.connect(buyer).buyTokens(amount, referrer);
}

describe("MytreeToken", function () {
  it("mints a fixed 10,000,000,000 supply to the treasury and cannot mint again", async function () {
    const { token, treasury } = await deployFixture();
    expect(await token.name()).to.equal("mytree");
    expect(await token.symbol()).to.equal("mytree");
    expect(await token.totalSupply()).to.equal(ethers.parseEther("10000000000"));
    expect(await token.balanceOf(treasury.address)).to.equal(ethers.parseEther("9999850000"));
    expect(await token.MAX_SUPPLY()).to.equal(ethers.parseEther("10000000000"));
  });
});

describe("MytreePresale", function () {
  it("sells tokens for USDT with no bonus when no referrer is passed", async function () {
    const { presale, buyer, token, usdt } = await deployFixture();
    const paid = ethers.parseEther("0.1");
    await expect(buy(usdt, presale, buyer, paid))
      .to.emit(presale, "TokensPurchased")
      .withArgs(buyer.address, paid, ethers.parseEther("1000"));

    expect(await token.balanceOf(buyer.address)).to.equal(ethers.parseEther("1000"));
    expect(await usdt.balanceOf(await presale.getAddress())).to.equal(paid);
    expect(await presale.rewardsAllocated()).to.equal(0n);
  });

  it("lets B and A claim only tokens after C buys 100 with USDT", async function () {
    const { presale, buyer, referrer, level2, token, usdt } = await deployFixture();
    await buy(usdt, presale, level2, ethers.parseEther("0.01"));
    await buy(usdt, presale, referrer, ethers.parseEther("0.01"), level2.address);
    await presale.connect(level2).claim();
    const paid = ethers.parseEther("0.01");

    await expect(buy(usdt, presale, buyer, paid, referrer.address))
      .to.emit(presale, "ReferralAccrued")
      .withArgs(referrer.address, ethers.parseEther("10"));

    expect(await token.balanceOf(buyer.address)).to.equal(ethers.parseEther("100"));
    expect(await token.balanceOf(referrer.address)).to.equal(ethers.parseEther("100"));
    expect(await token.balanceOf(level2.address)).to.equal(ethers.parseEther("110"));
    expect(await presale.claimable(referrer.address)).to.equal(ethers.parseEther("10"));
    expect(await presale.claimable(level2.address)).to.equal(ethers.parseEther("5"));

    await expect(presale.connect(referrer).claim())
      .to.emit(presale, "ReferralClaimed")
      .withArgs(referrer.address, ethers.parseEther("10"));
    await presale.connect(level2).claim();

    expect(await token.balanceOf(referrer.address)).to.equal(ethers.parseEther("110"));
    expect(await token.balanceOf(level2.address)).to.equal(ethers.parseEther("115"));
    expect(await usdt.balanceOf(referrer.address)).to.equal(ethers.parseEther("19.99"));
    expect(await presale.claimable(referrer.address)).to.equal(0n);
    await expect(presale.connect(referrer).claim()).to.be.revertedWithCustomError(presale, "NothingToClaim");
  });

  it("rejects self-referral and does not accrue a bonus", async function () {
    const { presale, buyer, token, usdt } = await deployFixture();
    await buy(usdt, presale, buyer, ethers.parseEther("0.1"), buyer.address);
    expect(await token.balanceOf(buyer.address)).to.equal(ethers.parseEther("1000"));
    expect(await presale.referrerOf(buyer.address)).to.equal(ethers.ZeroAddress);
    expect(await presale.claimable(buyer.address)).to.equal(0n);
  });

  it("keeps the first referrer and ignores a later one", async function () {
    const { presale, buyer, referrer, stranger, usdt } = await deployFixture();
    const paid = ethers.parseEther("0.1");
    await buy(usdt, presale, buyer, paid, referrer.address);
    await buy(usdt, presale, buyer, paid, stranger.address);
    expect(await presale.referrerOf(buyer.address)).to.equal(referrer.address);
  });

  it("accrues an upstream level when enabled, and stops at maxDepth", async function () {
    const { presale, owner, buyer, referrer, level2, usdt } = await deployFixture();
    await presale.connect(owner).setUpstreamLevels([300], 2);
    await buy(usdt, presale, level2, ethers.parseEther("0.01"));
    await buy(usdt, presale, referrer, ethers.parseEther("0.1"), level2.address);
    await buy(usdt, presale, buyer, ethers.parseEther("0.1"), referrer.address);

    expect(await presale.claimable(referrer.address)).to.equal(ethers.parseEther("100"));
    expect(await presale.claimable(level2.address)).to.equal(ethers.parseEther("130"));
  });

  it("enforces min, max, pause, and round cap", async function () {
    const { presale, owner, buyer, usdt } = await deployFixture();
    await usdt.connect(buyer).approve(await presale.getAddress(), ethers.parseEther("20"));
    await expect(
      presale.connect(buyer).buyTokens(ethers.parseEther("0.001"), ethers.ZeroAddress)
    ).to.be.revertedWithCustomError(presale, "BelowMinimum");
    await expect(
      presale.connect(buyer).buyTokens(ethers.parseEther("6"), ethers.ZeroAddress)
    ).to.be.revertedWithCustomError(presale, "AboveMaximum");

    await presale.connect(owner).pause();
    await expect(
      presale.connect(buyer).buyTokens(ethers.parseEther("0.1"), ethers.ZeroAddress)
    ).to.be.revertedWithCustomError(presale, "EnforcedPause");
    await presale.connect(owner).unpause();

    await presale.connect(owner).setRoundCap(ethers.parseEther("500"));
    await expect(
      presale.connect(buyer).buyTokens(ethers.parseEther("0.1"), ethers.ZeroAddress)
    ).to.be.revertedWithCustomError(presale, "RoundSoldOut");
  });

  it("lets only the owner change price and withdraw USDT proceeds", async function () {
    const { presale, owner, buyer, referrer, usdt } = await deployFixture();
    await expect(presale.connect(buyer).setPrice(ONE)).to.be.revertedWithCustomError(
      presale,
      "OwnableUnauthorizedAccount"
    );
    await presale.connect(owner).setReferralBonuses(800, 200);
    const bonuses = await presale.getReferralBonuses();
    expect(bonuses[0]).to.equal(800);
    expect(bonuses[1]).to.equal(200);

    const paid = ethers.parseEther("0.1");
    await buy(usdt, presale, buyer, paid, referrer.address);
    await expect(presale.connect(buyer).withdrawToken(await usdt.getAddress(), buyer.address, paid)).to.be.revertedWithCustomError(
      presale,
      "OwnableUnauthorizedAccount"
    );
    await presale.connect(owner).withdrawToken(await usdt.getAddress(), owner.address, paid);
    expect(await usdt.balanceOf(owner.address)).to.equal(paid);
  });

  it("blocks blacklisted buyers and does not accrue a blacklisted referrer", async function () {
    const { presale, owner, buyer, referrer, token, usdt } = await deployFixture();
    await usdt.connect(buyer).approve(await presale.getAddress(), ethers.parseEther("1"));
    await presale.connect(owner).setBlacklist([buyer.address], true);
    await expect(
      presale.connect(buyer).buyTokens(ethers.parseEther("0.1"), referrer.address)
    ).to.be.revertedWithCustomError(presale, "BlacklistedBuyer");

    await presale.connect(owner).setBlacklist([buyer.address], false);
    await buy(usdt, presale, referrer, ethers.parseEther("0.01"));
    await presale.connect(owner).setBlacklist([referrer.address], true);
    await buy(usdt, presale, buyer, ethers.parseEther("0.1"), referrer.address);
    expect(await presale.claimable(referrer.address)).to.equal(0n);
    expect(await token.balanceOf(buyer.address)).to.equal(ethers.parseEther("1000"));
  });

  it("lets the owner deposit and withdraw tokens, and transfer ownership", async function () {
    const { presale, owner, treasury, buyer, token } = await deployFixture();
    const amount = ethers.parseEther("25");
    await token.connect(treasury).transfer(owner.address, amount);
    await token.connect(owner).approve(await presale.getAddress(), amount);
    await expect(presale.connect(owner).depositToken(await token.getAddress(), amount))
      .to.emit(presale, "TokenDeposited");
    await presale.connect(owner).withdrawToken(await token.getAddress(), buyer.address, amount);
    expect(await token.balanceOf(buyer.address)).to.equal(amount);

    await expect(presale.connect(buyer).transferOwnership(buyer.address)).to.be.revertedWithCustomError(
      presale,
      "OwnableUnauthorizedAccount"
    );
    await presale.connect(owner).transferOwnership(buyer.address);
    expect(await presale.owner()).to.equal(buyer.address);
  });

  it("will not let the owner drain unclaimed referral tokens or renounce ownership", async function () {
    const { presale, owner, buyer, referrer, level2, token, usdt } = await deployFixture();
    await buy(usdt, presale, level2, ethers.parseEther("0.01"));
    await buy(usdt, presale, referrer, ethers.parseEther("0.01"), level2.address);
    await buy(usdt, presale, buyer, ethers.parseEther("0.01"), referrer.address);
    const reserved = await presale.claimable(referrer.address) + await presale.claimable(level2.address);
    const bal = await token.balanceOf(await presale.getAddress());
    await expect(
      presale.connect(owner).withdrawToken(await token.getAddress(), owner.address, bal - reserved + 1n)
    ).to.be.revertedWithCustomError(presale, "InsufficientInventory");
    await expect(presale.connect(owner).renounceOwnership()).to.be.revertedWith("renounce disabled");
  });

  it("pays referral income only on the first purchase, and only to sponsors who already bought", async function () {
    const { presale, buyer, referrer, level2, token, usdt } = await deployFixture();
    const paid = ethers.parseEther("0.01");

    await buy(usdt, presale, level2, paid);
    await presale.connect(referrer).attachReferrer(level2.address);
    await buy(usdt, presale, buyer, paid, referrer.address);

    expect(await presale.claimable(referrer.address)).to.equal(0n);
    expect(await presale.claimable(level2.address)).to.equal(ethers.parseEther("5"));
    expect(await token.balanceOf(buyer.address)).to.equal(ethers.parseEther("100"));

    const before = await presale.claimable(level2.address);
    await buy(usdt, presale, buyer, paid, referrer.address);
    expect(await presale.hasPurchased(buyer.address)).to.equal(true);
    expect(await presale.claimable(level2.address)).to.equal(before);
    expect(await presale.claimable(referrer.address)).to.equal(0n);
    expect(await token.balanceOf(buyer.address)).to.equal(ethers.parseEther("200"));
  });

  it("locks the USDT address after the first purchase and rejects a rewards cap below reserved claims", async function () {
    const { presale, owner, buyer, referrer, usdt, treasury } = await deployFixture();
    await expect(presale.connect(owner).setUsdt(await usdt.getAddress())).to.emit(presale, "UsdtUpdated");
    await buy(usdt, presale, referrer, ethers.parseEther("0.01"));
    await buy(usdt, presale, buyer, ethers.parseEther("0.01"), referrer.address);
    const other = await (await ethers.getContractFactory("MytreeToken")).deploy(treasury.address, owner.address);
    await expect(presale.connect(owner).setUsdt(await other.getAddress())).to.be.revertedWithCustomError(presale, "SaleStarted");
    await expect(presale.connect(owner).setRewardsPoolCap(0)).to.be.revertedWithCustomError(presale, "CapBelowAllocated");
  });
});
