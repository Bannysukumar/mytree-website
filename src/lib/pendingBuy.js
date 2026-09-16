const KEY = "mytree_pending_buy";

export function savePendingBuy(data) {
  const current = readPendingBuy();
  localStorage.setItem(KEY, JSON.stringify({ ...data, at: current?.at || Date.now() }));
}

export function readPendingBuy() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) || "null");
    if (!data || Date.now() - Number(data.at) > 20 * 60 * 1000) {
      clearPendingBuy();
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function clearPendingBuy() {
  localStorage.removeItem(KEY);
}
