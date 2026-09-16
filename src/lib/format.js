export function formatNumber(value, digits = 0) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return "0";
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(n);
}

export function formatInr(value) {
  return `₹${formatNumber(value, Number(value) % 1 === 0 ? 0 : 2)}`;
}

export function formatUsd(value) {
  const n = Number(value || 0);
  const digits = n > 0 && n < 1 ? 6 : 2;
  return `$${formatNumber(n, digits)}`;
}

export function shortAddress(address) {
  if (!address) return "";
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function fillTemplate(template, vars) {
  return String(template || "").replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}

export function sortByOrder(rows) {
  return [...(rows || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
}

export function usdToWei(usd, nativeUsdRate) {
  const rate = Number(nativeUsdRate);
  const amount = Number(usd);
  if (!rate || !amount || amount <= 0) return 0n;
  const usdScaled = BigInt(Math.round(amount * 1_000_000));
  const rateScaled = BigInt(Math.round(rate * 1_000_000));
  return (usdScaled * 10n ** 18n) / rateScaled;
}

export function explorerTx(explorerUrl, hash) {
  if (!explorerUrl || !hash) return "";
  return `${explorerUrl.replace(/\/$/, "")}/tx/${hash}`;
}

export function explorerAddress(explorerUrl, address) {
  if (!explorerUrl || !address) return "";
  return `${explorerUrl.replace(/\/$/, "")}/address/${address}`;
}
