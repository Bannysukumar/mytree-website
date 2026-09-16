const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { db, hitLimit, clientKey, FieldValue } = require("./lib/rateLimit");

/** Optional email ping when someone writes the contact form. Form itself is a direct Firestore write. */
exports.notifyContact = onCall(async (request) => {
  const allowed = await hitLimit(`contact:${clientKey(request)}`, 5, 60 * 60 * 1000);
  if (!allowed) throw new HttpsError("resource-exhausted", "Please wait before sending another note.");

  const name = String(request.data?.name || "").trim().slice(0, 80);
  const email = String(request.data?.email || "").trim().slice(0, 120);
  const message = String(request.data?.message || "").trim().slice(0, 2000);
  if (!name || !message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpsError("invalid-argument", "Name, email, and a message are required.");
  }

  await db().collection("contactSubmissions").add({
    name,
    email,
    message,
    createdAt: FieldValue.serverTimestamp(),
  });

  const apiKey = process.env.SENDGRID_API_KEY;
  const notify = process.env.ADMIN_NOTIFY_EMAIL;
  if (apiKey && notify && process.env.FROM_EMAIL) {
    await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: notify }] }],
        from: { email: process.env.FROM_EMAIL, name: "Mytree Ecosystem" },
        subject: `Contact form: ${name}`,
        content: [{ type: "text/plain", value: `${name} <${email}>\n\n${message}` }],
      }),
    });
  }
  return { ok: true };
});
