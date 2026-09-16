import { formatNumber, formatUsd } from "../lib/format";

export function visibleNav(config) {
  return (config?.nav || []).filter((item) => item.visible !== false && !item.parent);
}

export function childrenOf(config, id) {
  return (config?.nav || []).filter((item) => item.visible !== false && item.parent === id);
}

export function spendOf(purchases, address, priceUsd) {
  const mine = (purchases || []).filter(
    (row) => String(row.buyer || "").toLowerCase() === String(address || "").toLowerCase() && ["confirmed", "success"].includes(row.status)
  );
  const count = mine.length;
  const spend = mine.reduce((sum, row) => {
    if (row.amountUsd) return sum + Number(row.amountUsd);
    return sum + Number(row.tokensWhole || 0) * Number(priceUsd || 0);
  }, 0);
  const volume = mine.reduce((sum, row) => sum + Number(row.tokensWhole || 0), 0);
  return { mine, count, spend, volume };
}

export function nextMilestone(milestones, stats) {
  const rows = [...(milestones || [])].sort((a, b) => Number(a.spendUsd) - Number(b.spendUsd));
  const next = rows.find((row) => stats.spend < Number(row.spendUsd) || stats.count < Number(row.purchaseCount));
  return { rows, next };
}

export function currentRank(ranks, spend) {
  const rows = [...(ranks || [])].sort((a, b) => Number(a.spendUsd) - Number(b.spendUsd));
  let current = rows[0] || null;
  let next = null;
  rows.forEach((rank, index) => {
    if (spend >= Number(rank.spendUsd || 0)) {
      current = rank;
      next = rows[index + 1] || null;
    }
  });
  const span = next ? Number(next.spendUsd) - Number(current?.spendUsd || 0) : 1;
  const progress = next ? Math.min(100, ((spend - Number(current?.spendUsd || 0)) / span) * 100) : 100;
  return { current, next, progress, rows };
}

export function fill(template, vars) {
  return String(template || "").replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}

export function periodStart(mode) {
  const now = new Date();
  if (mode === "daily") return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  if (mode === "monthly") return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
  return 0;
}

export function inPeriod(row, mode) {
  const start = periodStart(mode);
  if (!start) return true;
  const stamp = row.createdAt?.toMillis?.() || Date.parse(row.createdAt || 0) || 0;
  return stamp >= start;
}

export { formatNumber, formatUsd };
