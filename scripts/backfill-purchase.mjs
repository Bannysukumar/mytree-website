/**
 * Writes the already-confirmed mainnet purchase into Firestore so admin can see it.
 */
import { readFileSync } from "node:fs";
import { ethers } from "ethers";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import dotenv from "dotenv";

dotenv.config();

const txHash = "0x7f095e995f4991a26b0b0d82e7d9ffbf4c0fb75e2357edc2c7607aa01ee7b310";
const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || "uwgea32-firebase-adminsdk-fbsvc-bd56d9738f.json";
initializeApp({
  credential: cert(JSON.parse(readFileSync(credPath, "utf8"))),
  projectId: "uwgea32",
});

const provider = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL || "https://bsc-dataseed.binance.org", 56);
const receipt = await provider.getTransactionReceipt(txHash);
if (!receipt || receipt.status !== 1) throw new Error("Purchase receipt is not confirmed");

const iface = new ethers.Interface([
  "event TokensPurchased(address indexed buyer, uint256 usdtPaid, uint256 tokensReceived)",
]);
let buyer = "";
let usdtPaid = 0n;
let tokensReceived = 0n;
for (const log of receipt.logs) {
  try {
    const parsed = iface.parseLog(log);
    if (parsed?.name === "TokensPurchased") {
      buyer = String(parsed.args.buyer).toLowerCase();
      usdtPaid = parsed.args.usdtPaid;
      tokensReceived = parsed.args.tokensReceived;
    }
  } catch {
    // not this event
  }
}
if (!buyer) throw new Error("Purchase event was not in the receipt");

const db = getFirestore();
const ref = db.collection("purchases").doc(txHash.toLowerCase());
const existing = await ref.get();
const tokensWhole = Number(ethers.formatUnits(tokensReceived, 18));
await ref.set({
  txHash,
  buyer,
  referrer: "",
  usdtPaid: usdtPaid.toString(),
  tokensReceived: tokensReceived.toString(),
  tokensWhole,
  status: "confirmed",
  blockNumber: receipt.blockNumber,
  createdAt: existing.data()?.createdAt || new Date("2026-09-16T13:49:43.000Z"),
  confirmedAt: FieldValue.serverTimestamp(),
  updatedAt: FieldValue.serverTimestamp(),
}, { merge: true });

if (existing.data()?.status !== "confirmed") {
  await db.collection("stats").doc("public").set({
    tokensSold: FieldValue.increment(tokensWhole),
    purchaseCount: FieldValue.increment(1),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  await db.collection("users").doc(buyer).set({
    wallet: buyer,
    purchaseCount: FieldValue.increment(1),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
}

console.log(JSON.stringify({ buyer, tokensWhole, status: "confirmed" }));
