/**
 * Sets the live USDT price so 1 mytree equals 5 rupees, and starts an 11-day timer.
 * Does not print secrets.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { ethers } from "ethers";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import dotenv from "dotenv";

dotenv.config();

const presaleAddress = "0x23d89E889D071fe9be5c59d3505A65187599d9Cf";
const inrPerToken = 5;
const days = 11;

const rateResponse = await fetch("https://open.er-api.com/v6/latest/USD");
const rateJson = await rateResponse.json();
const inrPerUsd = Number(rateJson?.rates?.INR);
if (!inrPerUsd || inrPerUsd < 50) throw new Error("Could not read a live USD/INR rate");

const usdtPerToken = inrPerToken / inrPerUsd;
const price = ethers.parseUnits(usdtPerToken.toFixed(8), 18);
const endsAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

const rpc = process.env.BSC_RPC_URL || "https://bsc-dataseed.binance.org";
const rawKey = process.env.PRIVATE_KEY || "";
if (!rawKey) throw new Error("PRIVATE_KEY is required to set the on-chain price");
const wallet = new ethers.Wallet(rawKey.startsWith("0x") ? rawKey : `0x${rawKey}`, new ethers.JsonRpcProvider(rpc, 56));
const presale = new ethers.Contract(presaleAddress, ["function setPrice(uint256)", "function pricePerToken() view returns (uint256)", "function owner() view returns (address)"], wallet);
if ((await presale.owner()).toLowerCase() !== wallet.address.toLowerCase()) {
  throw new Error("Deployer is not the presale owner");
}
const tx = await presale.setPrice(price);
const receipt = await tx.wait();
if (receipt.status !== 1) throw new Error("setPrice failed");

const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || "uwgea32-firebase-adminsdk-fbsvc-bd56d9738f.json";
initializeApp({
  credential: cert(JSON.parse(readFileSync(credPath, "utf8"))),
  projectId: "uwgea32",
});
const db = getFirestore();
await db.collection("config").doc("sale").set({
  priceUsd: Number(ethers.formatUnits(price, 18)),
  priceInr: inrPerToken,
  nativeUsdRate: inrPerUsd,
  timerEnabled: true,
  timerEndsAt: endsAt,
  timerLabel: "Presale round closes in",
  timerEndedText: "This presale round has closed.",
}, { merge: true });

const seedPath = new URL("../public/seed/content.json", import.meta.url);
const content = JSON.parse(readFileSync(seedPath, "utf8"));
content.sale.priceUsd = Number(ethers.formatUnits(price, 18));
content.sale.priceInr = inrPerToken;
content.sale.nativeUsdRate = inrPerUsd;
content.sale.timerEnabled = true;
content.sale.timerEndsAt = endsAt;
content.sale.timerLabel = "Presale round closes in";
writeFileSync(seedPath, `${JSON.stringify(content, null, 2)}\n`);

console.log(JSON.stringify({
  inrPerToken,
  inrPerUsd,
  usdtPerToken: ethers.formatUnits(price, 18),
  timerEndsAt: endsAt,
  tx: tx.hash,
}, null, 2));
