/**
 * Deploys a new MytreePresale against the existing token.
 * Leaves unclaimed referral rewards in the old presale so those claims still work.
 * Does not redeploy the token.
 */
require("dotenv").config();
const { ethers, network } = require("hardhat");

const OLD_PRESALE = "0x23d89E889D071fe9be5c59d3505A65187599d9Cf";
const TOKEN = "0x8C193b59Ea21Ce7c6e1396EBE592A23EB9Ca00Dd";

async function main() {
  if (network.name !== "bsc") throw new Error("Run with --network bsc");
  const [deployer] = await ethers.getSigners();
  const old = await ethers.getContractAt("MytreePresale", OLD_PRESALE);
  const token = await ethers.getContractAt("MytreeToken", TOKEN);

  const price = await old.pricePerToken();
  const min = await old.minPurchase();
  const max = await old.maxPurchase();
  const roundCap = await old.roundCap();
  const sold = await old.tokensSold();
  const rewardsCap = await old.rewardsPoolCap();
  const allocated = await old.rewardsAllocated();
  const paid = await old.rewardsPaid();
  const reserved = allocated - paid;
  const usdt = await old.usdt();

  const Presale = await ethers.getContractFactory("MytreePresale");
  const presale = await Presale.deploy(TOKEN, deployer.address, price, min, max, roundCap, rewardsCap, usdt);
  await presale.waitForDeployment();
  const presaleAddress = await presale.getAddress();

  const oldBal = await token.balanceOf(OLD_PRESALE);
  if (oldBal < reserved) throw new Error("Old presale cannot cover reserved claims");
  const withdrawable = oldBal - reserved;
  if (withdrawable > 0n) {
    const pulled = await old.withdrawToken(TOKEN, deployer.address, withdrawable);
    await pulled.wait();
  }

  const ownerBal = await token.balanceOf(deployer.address);
  const fund = ownerBal < withdrawable ? ownerBal : withdrawable;
  if (fund === 0n) throw new Error("No tokens available to fund the new presale");
  const sent = await token.transfer(presaleAddress, fund);
  await sent.wait();
  const needed = roundCap + rewardsCap;
  if (fund < needed && fund > rewardsCap) {
    const fitted = await presale.setRoundCap(fund - rewardsCap);
    await fitted.wait();
  }

  console.log(`MytreePresale: ${presaleAddress}`);
  console.log(`Token:         ${TOKEN}`);
  console.log(`Funded:        ${ethers.formatEther(fund)}`);
  console.log(`Reserved on old contract: ${ethers.formatEther(reserved)}`);
  console.log(`Previously sold: ${ethers.formatEther(sold)}`);
}

main().catch((error) => {
  console.error(error.shortMessage || error.message);
  process.exitCode = 1;
});
