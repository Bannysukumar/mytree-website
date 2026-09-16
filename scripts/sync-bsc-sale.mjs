/**
 * Merges BSC USDT sale settings and claim copy into live Firestore.
 * Does not wipe contract addresses, timers, or other sale fields.
 * Does not deploy contracts.
 */
import { readFileSync } from "node:fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || "uwgea32-firebase-adminsdk-fbsvc-bd56d9738f.json";
initializeApp({
  credential: cert(JSON.parse(readFileSync(credPath, "utf8"))),
  projectId: "uwgea32",
});

const db = getFirestore();
const content = JSON.parse(readFileSync(new URL("../public/seed/content.json", import.meta.url), "utf8"));
const dashboard = JSON.parse(readFileSync(new URL("../public/seed/dashboard.json", import.meta.url), "utf8"));

await db.collection("config").doc("sale").set(
  {
    chainId: 56,
    explorerUrl: "https://bscscan.com",
    paymentSymbol: "USDT",
    usdtAddress: content.sale.usdtAddress,
    usdtDecimals: 18,
    contractAddress: content.sale.contractAddress,
    tokenAddress: content.sale.tokenAddress,
    priceUsd: content.sale.priceUsd,
    minPurchaseUsd: content.sale.minPurchaseUsd,
    maxPurchaseUsd: content.sale.maxPurchaseUsd,
    roundSupply: content.sale.roundSupply,
    paused: false,
  },
  { merge: true }
);
await db.collection("tokenomics").doc("current").set(content.tokenomics, { merge: true });

await db.collection("site").doc("legal").set(
  { buy: content.legal.buy, referral: content.legal.referral, donate: content.legal.donate },
  { merge: true }
);
await db.collection("site").doc("referralCopy").set(content.referralCopy);

const dashRef = db.collection("config").doc("dashboard");
const dash = (await dashRef.get()).data() || {};
await dashRef.set({
  copy: {
    ...(dash.copy || {}),
    claimTitle: dashboard.copy.claimTitle,
    claimLocked: dashboard.copy.claimLocked,
    claimReady: dashboard.copy.claimReady,
  },
  currencies: dashboard.currencies,
  claim: dashboard.claim,
}, { merge: true });

const saleBefore = (await db.collection("config").doc("sale").get()).data() || {};
if (Number(saleBefore.tokensSold) === 18450000) {
  await db.collection("config").doc("sale").set({ tokensSold: 0 }, { merge: true });
}
const publicStats = db.collection("stats").doc("public");
const stats = (await publicStats.get()).data() || {};
if (Number(stats.tokensSold) === 18450000) {
  await publicStats.set({ tokensSold: 0 }, { merge: true });
}

const sale = (await db.collection("config").doc("sale").get()).data() || {};
console.log(JSON.stringify({
  chainId: sale.chainId,
  paymentSymbol: sale.paymentSymbol,
  explorerUrl: sale.explorerUrl,
  contractAddress: sale.contractAddress || "",
  tokenAddress: sale.tokenAddress || "",
}, null, 2));
