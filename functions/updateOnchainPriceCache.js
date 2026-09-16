const { onSchedule } = require("firebase-functions/v2/scheduler");
const { db, FieldValue } = require("./lib/rateLimit");

const ABI = [
  "function getCurrentPrice() view returns (uint256)",
  "function tokensSold() view returns (uint256)",
  "function tokensRemaining() view returns (uint256)",
  "function paused() view returns (bool)",
  "function getReferralBonuses() view returns (uint16, uint16, uint8)",
];

/** Mirrors on-chain sale figures into Firestore so the public site can render them without a wallet. */
exports.updateOnchainPriceCache = onSchedule({ schedule: "every 5 minutes" }, async () => {
  const { Contract, JsonRpcProvider, formatEther } = require("ethers");
  const saleSnap = await db().collection("config").doc("sale").get();
  const sale = saleSnap.data() || {};
  if (!sale.contractAddress || !process.env.RPC_URL) return;

  const contract = new Contract(sale.contractAddress, ABI, new JsonRpcProvider(process.env.RPC_URL));
  const [price, sold, remaining, paused, bonuses] = await Promise.all([
    contract.getCurrentPrice(),
    contract.tokensSold(),
    contract.tokensRemaining(),
    contract.paused(),
    contract.getReferralBonuses(),
  ]);

  await db()
    .collection("config")
    .doc("sale")
    .set(
      {
        chainPriceWei: price.toString(),
        chainPriceEth: formatEther(price),
        chainTokensSold: formatEther(sold),
        chainTokensRemaining: formatEther(remaining),
        chainPaused: paused,
        chainReferrerBps: Number(bonuses[0]),
        chainBuyerBps: Number(bonuses[1]),
        chainSyncedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
});
