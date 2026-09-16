const { db, FieldValue } = require("./lib/rateLimit");

const PRESALE_ABI = [
  "event TokensPurchased(address indexed buyer, uint256 usdtPaid, uint256 tokensReceived)",
  "event ReferralAccrued(address indexed earner, uint256 amount)",
];

/**
 * Records a confirmed USDT purchase. Referral income is accrued, not sent,
 * until the earner calls claim(). This function never transfers tokens or USDT.
 * INR donations never reach this path.
 */
async function recordConfirmedPurchase(ref, data, receipt) {
  const { Interface, formatEther } = require("ethers");
  const iface = new Interface(PRESALE_ABI);
  const existing = await ref.get();
  if (existing.data()?.status === "confirmed") return;

  let tokensReceived = "0";
  const bonuses = [];
  for (const log of receipt.logs || []) {
    let parsed;
    try {
      parsed = iface.parseLog(log);
    } catch {
      continue;
    }
    if (!parsed) continue;
    if (parsed.name === "TokensPurchased") {
      tokensReceived = parsed.args.tokensReceived.toString();
    }
    if (parsed.name === "ReferralAccrued") {
      bonuses.push({
        earnerId: String(parsed.args.earner).toLowerCase(),
        role: bonuses.length === 0 ? "direct" : "upstream",
        percentage: bonuses.length === 0 ? 10 : 5,
        amountInTokens: parsed.args.amount.toString(),
      });
    }
  }

  const tokensWhole = Number(formatEther(tokensReceived || "0"));
  const batch = db().batch();
  batch.set(
    ref,
    {
      status: "confirmed",
      tokensReceived,
      tokensWhole,
      blockNumber: receipt.blockNumber,
      confirmedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  for (const bonus of bonuses) {
    const whole = Number(formatEther(bonus.amountInTokens));
    const entry = db().collection("referralLedger").doc();
    batch.set(entry, {
      fromTxId: data.txHash,
      buyerId: data.buyer,
      earnerId: bonus.earnerId,
      role: bonus.role,
      amountInTokens: bonus.amountInTokens,
      amountDisplay: whole,
      percentage: bonus.percentage || null,
      status: "claimable",
      createdAt: FieldValue.serverTimestamp(),
    });
    const userRef = db().collection("users").doc(bonus.earnerId);
    batch.set(
      userRef,
      {
        wallet: bonus.earnerId,
        lifetimeBonus: FieldValue.increment(whole),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }

  const stats = db().collection("stats").doc("public");
  batch.set(
    stats,
    {
      tokensSold: FieldValue.increment(tokensWhole),
      purchaseCount: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  await batch.commit();

  if (data.buyer) {
    const buyerRef = db().collection("users").doc(data.buyer);
    const buyerPatch = {
      wallet: data.buyer,
      purchaseCount: FieldValue.increment(1),
    };
    if (data.referrer) buyerPatch.referredBy = data.referrer;
    await buyerRef.set(buyerPatch, { merge: true });
    if (data.referrer) {
      await db()
        .collection("users")
        .doc(data.referrer)
        .set(
          {
            wallet: data.referrer,
            referralCount: FieldValue.increment(1),
          },
          { merge: true }
        );
    }
  }
}

module.exports = { recordConfirmedPurchase };
