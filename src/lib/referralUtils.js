const REF_KEY = "mytree_ref";
const TX_KEY = "mytree_pending_tx";

export function normalizeRef(raw) {
  const value = String(raw || "").trim();
  if (/^0x[a-fA-F0-9]{40}$/.test(value)) return value.toLowerCase();
  const code = value.toUpperCase();
  return /^[A-F0-9]{8}$/.test(code) ? code : "";
}

export function captureReferralFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const ref = normalizeRef(params.get("ref"));
  if (!ref) return readReferralCode();
  localStorage.setItem(REF_KEY, ref);
  document.cookie = `${REF_KEY}=${encodeURIComponent(ref)};path=/;max-age=2592000;samesite=lax`;
  return ref;
}

export function readReferralCode() {
  const stored = localStorage.getItem(REF_KEY);
  if (stored) return stored;
  const match = document.cookie.match(/(?:^|; )mytree_ref=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

export function referralLink(wallet) {
  const origin = window.location.origin || import.meta.env.VITE_SITE_URL || "";
  return `${origin.replace(/\/$/, "")}/join?ref=${wallet}`;
}

export function rememberPendingTx(tx) {
  localStorage.setItem(TX_KEY, JSON.stringify(tx));
}

export function readPendingTx() {
  try {
    return JSON.parse(localStorage.getItem(TX_KEY) || "null");
  } catch {
    return null;
  }
}

export function clearPendingTx() {
  localStorage.removeItem(TX_KEY);
}

export function profileMessage(address) {
  return `Mytree Ecosystem referral profile\n${address.toLowerCase()}`;
}

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
