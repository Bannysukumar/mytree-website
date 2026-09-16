const crypto = require("crypto");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { db, hitLimit, clientKey, FieldValue } = require("./lib/rateLimit");

/**
 * Checks the Checkout signature the browser received. This does NOT mark the
 * donation paid — the Razorpay webhook is the source of truth. A verified
 * checkout only flips `checkoutVerified` so the UI can show a pending receipt.
 */
exports.verifyRazorpayPayment = onCall(async (request) => {
    const allowed = await hitLimit(`verify:${clientKey(request)}`, 20, 10 * 60 * 1000);
    if (!allowed) throw new HttpsError("resource-exhausted", "Too many verification attempts.");

    const orderId = String(request.data?.razorpay_order_id || "");
    const paymentId = String(request.data?.razorpay_payment_id || "");
    const signature = String(request.data?.razorpay_signature || "");
    if (!orderId || !paymentId || !signature) {
      throw new HttpsError("invalid-argument", "Missing Razorpay checkout fields.");
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) throw new HttpsError("failed-precondition", "Razorpay secret is not configured.");

    const expected = crypto.createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
    const left = Buffer.from(expected);
    const right = Buffer.from(signature);
    const valid = left.length === right.length && crypto.timingSafeEqual(left, right);
    if (!valid) {
      throw new HttpsError("permission-denied", "Payment signature did not match.");
    }

    await db().collection("donations").doc(orderId).set(
      {
        paymentId,
        checkoutVerified: true,
        checkoutVerifiedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return {
      ok: true,
      status: "awaiting_webhook",
      message: "Checkout signature verified. The donation is confirmed once the Razorpay webhook records it.",
    };
  });
