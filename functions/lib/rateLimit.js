const { initializeApp, getApps } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

if (!getApps().length) {
  initializeApp({
    projectId: process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || "uwgea32",
  });
}

function db() {
  return getFirestore();
}

/** Coarse fixed-window limiter. Key should already be a hash or a stable id. */
async function hitLimit(key, maxHits, windowMs) {
  const ref = db().collection("rateLimits").doc(key);
  const now = Date.now();
  return db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.exists ? snap.data() : { count: 0, windowStart: now };
    const expired = now - data.windowStart > windowMs;
    const count = expired ? 1 : data.count + 1;
    if (count > maxHits) return false;
    tx.set(ref, { count, windowStart: expired ? now : data.windowStart, updatedAt: FieldValue.serverTimestamp() });
    return true;
  });
}

function clientKey(request) {
  const ip =
    request.rawRequest?.headers?.["x-forwarded-for"]?.split(",")[0]?.trim() ||
    request.rawRequest?.ip ||
    "unknown";
  return ip.replace(/[^a-zA-Z0-9:._-]/g, "").slice(0, 80);
}

module.exports = { db, hitLimit, clientKey, FieldValue };
