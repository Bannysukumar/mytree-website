const { onCall, HttpsError } = require("firebase-functions/v2/https");
const Razorpay = require("razorpay");
const { db, hitLimit, clientKey, FieldValue } = require("./lib/rateLimit");

/**
 * Creates an INR Razorpay order. This path never touches wallets, $MYTREE,
 * or the referral ledger. The key secret stays in function env / secrets.
 */
exports.createRazorpayOrder = onCall(async (request) => {
    const allowed = await hitLimit(`order:${clientKey(request)}`, 8, 10 * 60 * 1000);
    if (!allowed) {
      throw new HttpsError("resource-exhausted", "Too many donation attempts. Try again shortly.");
    }

    const amountInr = Number(request.data?.amountInr);
    const name = String(request.data?.name || "").trim().slice(0, 80);
    const email = String(request.data?.email || "").trim().slice(0, 120);
    const purpose = String(request.data?.purpose || "General climate fund").trim().slice(0, 160);

    if (!Number.isFinite(amountInr) || amountInr < 100 || amountInr > 500000) {
      throw new HttpsError("invalid-argument", "Donation must be between ₹100 and ₹5,00,000.");
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new HttpsError("invalid-argument", "Enter a valid email or leave it blank.");
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      throw new HttpsError("failed-precondition", "Razorpay is not configured on the server.");
    }

    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const receipt = `mytree_${Date.now()}`;
    const order = await razorpay.orders.create({
      amount: Math.round(amountInr * 100),
      currency: "INR",
      receipt,
      notes: { name, email, purpose, source: "mytree-donate" },
    });

    await db().collection("donations").doc(order.id).set({
      orderId: order.id,
      amountInr,
      currency: "INR",
      name,
      email,
      purpose,
      status: "created",
      checkoutVerified: false,
      referralEligible: false,
      tokenIssued: false,
      createdAt: FieldValue.serverTimestamp(),
    });

    return { orderId: order.id, amount: order.amount, currency: "INR", keyId, name, email, purpose };
  });
