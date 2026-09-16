const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { db, hitLimit, clientKey, FieldValue } = require("./lib/rateLimit");

function ethers() {
  return require("ethers");
}

function referralCode(address) {
  const { keccak256, getAddress } = ethers();
  return keccak256(getAddress(address)).slice(2, 10).toUpperCase();
}

function expectedMessage(address) {
  const { getAddress } = ethers();
  return `Mytree Ecosystem referral profile\n${getAddress(address).toLowerCase()}`;
}

/**
 * Creates the wallet's referral code after a signature check, and binds the
 * first referrer it landed with. Subsequent calls cannot overwrite referredBy.
 * This is what survives a wallet-app redirect: attribution is stored against
 * the wallet, not only in a URL parameter.
 */
exports.ensureReferralProfile = onCall(async (request) => {
  const allowed = await hitLimit(`profile:${clientKey(request)}`, 10, 10 * 60 * 1000);
  if (!allowed) throw new HttpsError("resource-exhausted", "Too many profile attempts.");

  const { getAddress, verifyMessage } = ethers();
  const address = String(request.data?.address || "");
  const signature = String(request.data?.signature || "");
  const referredByCode = String(request.data?.referredByCode || "")
    .trim()
    .toUpperCase();

  let checksum;
  try {
    checksum = getAddress(address);
  } catch {
    throw new HttpsError("invalid-argument", "Invalid wallet address.");
  }
  const recovered = verifyMessage(expectedMessage(checksum), signature);
  if (getAddress(recovered) !== checksum) {
    throw new HttpsError("permission-denied", "Signature does not match this wallet.");
  }

  const walletId = checksum.toLowerCase();
  const code = referralCode(checksum);
  const userRef = db().collection("users").doc(walletId);
  const existing = await userRef.get();
  const current = existing.exists ? existing.data() : {};

  let referredBy = current.referredBy || "";
  const referredByWallet = String(request.data?.referredByWallet || "").trim();
  if (!referredBy && referredByWallet) {
    let ref;
    try {
      ref = getAddress(referredByWallet).toLowerCase();
    } catch {
      throw new HttpsError("invalid-argument", "Enter a valid referral wallet address.");
    }
    if (ref === walletId) throw new HttpsError("invalid-argument", "You cannot refer yourself.");
    referredBy = ref;
    await db().collection("users").doc(ref).set({
      wallet: ref,
      referralCode: referralCode(getAddress(referredByWallet)),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  }
  if (!referredBy && referredByCode) {
    const codeSnap = await db().collection("codes").doc(referredByCode).get();
    const referrerWallet = codeSnap.exists ? codeSnap.data().wallet : "";
    if (referrerWallet && referrerWallet !== walletId) {
      referredBy = referrerWallet;
    }
  }

  await userRef.set(
    {
      wallet: walletId,
      referralCode: code,
      referredBy: referredBy || current.referredBy || "",
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: current.createdAt || FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  await db().collection("codes").doc(code).set({ wallet: walletId, code }, { merge: true });

  return { referralCode: code, referredBy: referredBy || "", wallet: walletId };
});

exports.lookupReferral = onCall(async (request) => {
  const { getAddress, isAddress } = ethers();
  const raw = String(request.data?.code || "").trim();
  if (isAddress(raw)) return { wallet: getAddress(raw).toLowerCase() };
  const code = raw.toUpperCase();
  if (!/^[A-F0-9]{8}$/.test(code)) return { wallet: "" };
  const snap = await db().collection("codes").doc(code).get();
  return { wallet: snap.exists ? snap.data().wallet : "" };
});
