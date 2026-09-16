const crypto = require("crypto");
const { onRequest } = require("firebase-functions/v2/https");
const { db, FieldValue } = require("./lib/rateLimit");

async function maybeEmailReceipt(donation) {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey || !donation.email || !process.env.FROM_EMAIL) return;
  await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: donation.email }] }],
      from: { email: process.env.FROM_EMAIL, name: "Mytree Ecosystem" },
      subject: "Your Mytree Ecosystem donation receipt",
      content: [
        {
          type: "text/plain",
          value: `Thank you for contributing ₹${donation.amountInr} to Mytree Ecosystem.\n\nPurpose: ${donation.purpose || "General climate fund"}\nPayment: ${donation.paymentId}\n\nThis is a fiat donation. It does not issue $MYTREE and is not part of the referral program.\n`,
        },
      ],
    }),
  });
}

async function bumpImpact(amountInr) {
  await db()
    .collection("stats")
    .doc("public")
    .set(
      {
        fundsRaisedInr: FieldValue.increment(amountInr),
        donationCount: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
}

/**
 * Independent confirmation path. A client callback cannot mark a donation paid.
 * Captured donations never call referral distribution and never transfer tokens.
 */
exports.razorpayWebhook = onRequest(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).send("POST only");
    return;
  }

  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature = req.headers["x-razorpay-signature"];
  if (!secret || !signature) {
    res.status(401).send("missing signature");
    return;
  }

  const expected = crypto.createHmac("sha256", secret).update(req.rawBody).digest("hex");
  if (expected !== signature) {
    res.status(401).send("invalid signature");
    return;
  }

  const event = req.body?.event;
  const payment = req.body?.payload?.payment?.entity;
  if (!payment) {
    res.status(200).send("ignored");
    return;
  }

  const orderId = payment.order_id;
  const ref = db().collection("donations").doc(orderId);
  const snap = await ref.get();
  const prev = snap.exists ? snap.data() : {};

  if (event === "payment.captured") {
    const alreadyPaid = prev.status === "paid";
    const amountInr = Number(payment.amount) / 100;
    await ref.set(
      {
        orderId,
        paymentId: payment.id,
        amountInr: prev.amountInr || amountInr,
        currency: "INR",
        status: "paid",
        email: prev.email || payment.email || "",
        name: prev.name || payment.notes?.name || "",
        purpose: prev.purpose || payment.notes?.purpose || "",
        method: payment.method || "",
        referralEligible: false,
        tokenIssued: false,
        paidAt: FieldValue.serverTimestamp(),
        webhookEvent: event,
      },
      { merge: true }
    );
    if (!alreadyPaid) {
      await bumpImpact(prev.amountInr || amountInr);
      try {
        await maybeEmailReceipt({ ...prev, amountInr: prev.amountInr || amountInr, paymentId: payment.id });
      } catch (err) {
        console.error("receipt email failed", err);
      }
    }
  } else if (event === "payment.failed") {
    await ref.set(
      {
        orderId,
        paymentId: payment.id,
        status: "failed",
        failureReason: payment.error_description || payment.error_reason || "failed",
        webhookEvent: event,
        failedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }

  res.status(200).send("ok");
});
