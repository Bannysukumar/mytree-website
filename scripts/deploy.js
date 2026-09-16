/**
 * Deploys MytreeToken (full supply to treasury) and MytreePresale, then
 * moves the sale allocation and referral-rewards allocation into the presale.
 *
 * Required env (see .env.example):
 *   RPC_URL, PRIVATE_KEY
 * Optional:
 *   TREASURY_ADDRESS (defaults to the deployer)
 *   SALE_ALLOCATION, REWARDS_ALLOCATION (whole tokens)
 *   USDT_ADDRESS (BSC USDT: 0x55d398326f99059fF775485246999027B3197955)
 *   PRICE_USDT_PER_TOKEN, MIN_USDT, MAX_USDT (human USDT amounts, 18 decimals)
 * Do not run this against BSC mainnet unless the operator explicitly asks.
 */
require("dotenv").config();
const { ethers, network } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  const treasury = process.env.TREASURY_ADDRESS || deployer.address;

  const usdtAddress = process.env.USDT_ADDRESS;
  const bscUsdt = "0x55d398326f99059fF775485246999027B3197955";
  if (!usdtAddress) throw new Error(`Set USDT_ADDRESS. BSC mainnet USDT is ${bscUsdt}`);
  if (network.name === "bsc") {
    const chain = await ethers.provider.getNetwork();
    if (Number(chain.chainId) !== 56) throw new Error(`Refusing deploy: expected BSC chain id 56, got ${chain.chainId}`);
    if (usdtAddress.toLowerCase() !== bscUsdt.toLowerCase()) {
      throw new Error(`Refusing BSC deploy with a non-official USDT address. Use ${bscUsdt}`);
    }
  }
  const price = ethers.parseUnits(process.env.PRICE_USDT_PER_TOKEN || "0.012", 18).toString();
  const min = ethers.parseUnits(process.env.MIN_USDT || "10", 18).toString();
  const max = ethers.parseUnits(process.env.MAX_USDT || "5000", 18).toString();

  const saleWhole = BigInt(process.env.SALE_ALLOCATION || "200000000");
  const rewardsWhole = BigInt(process.env.REWARDS_ALLOCATION || "80000000");
  const saleAmount = ethers.parseEther(saleWhole.toString());
  const rewardsAmount = ethers.parseEther(rewardsWhole.toString());

  console.log(`Network:  ${network.name}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Treasury: ${treasury}`);

  const Token = await ethers.getContractFactory("MytreeToken");
  const token = await Token.deploy(treasury, deployer.address);
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log(`MytreeToken:   ${tokenAddress}`);

  const Presale = await ethers.getContractFactory("MytreePresale");
  const presale = await Presale.deploy(
    tokenAddress,
    deployer.address,
    price,
    min,
    max,
    saleAmount,
    rewardsAmount,
    usdtAddress
  );
  await presale.waitForDeployment();
  const presaleAddress = await presale.getAddress();
  console.log(`MytreePresale: ${presaleAddress}`);

  const tokenAsTreasury = token.connect(await ethers.getSigner(treasury === deployer.address ? deployer.address : deployer.address));
  // Treasury and deployer are the same unless TREASURY_ADDRESS differs.
  // If they differ, the treasury must already have approved this script's signer
  // or the operator must transfer tokens manually after deploy.
  if (treasury.toLowerCase() === deployer.address.toLowerCase()) {
    const tx = await token.transfer(presaleAddress, saleAmount + rewardsAmount);
    await tx.wait();
    console.log(`Funded presale with ${saleWhole + rewardsWhole} MYTREE`);
  } else {
    console.log("Treasury differs from deployer. Transfer sale + rewards tokens to the presale manually:");
    console.log(`  token.transfer(${presaleAddress}, ${saleAmount + rewardsAmount})`);
  }

  console.log("\nWrite these into Admin → Sale and functions env:");
  console.log(`  PRESALE_ADDRESS=${presaleAddress}`);
  console.log(`  TOKEN_ADDRESS=${tokenAddress}`);
  void tokenAsTreasury;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
