const KEY = "mytree_go_dash";
const JOIN_KEY = "mytree_join_return";
const PAGE_KEY = "mytree_page_return";
const BUY_KEY = "mytree_buy_return";

export function herePath() {
  const path = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  return path === "/" ? "/#buy" : path;
}

export function markDashboardRedirect() {
  if (window.location.pathname.startsWith("/join")) {
    markJoinReturn();
    return;
  }
  sessionStorage.setItem(KEY, "1");
}

function readJoinCookie() {
  const match = document.cookie.match(new RegExp(`(?:^|; )${JOIN_KEY}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : "";
}

export function markJoinReturn(path = `${window.location.pathname}${window.location.search}`) {
  if (!path.startsWith("/join")) return;
  localStorage.setItem(JOIN_KEY, path);
  sessionStorage.setItem(JOIN_KEY, path);
  document.cookie = `${JOIN_KEY}=${encodeURIComponent(path)}; Path=/; Max-Age=86400; SameSite=Lax`;
}

export function readJoinReturn() {
  const path = localStorage.getItem(JOIN_KEY) || sessionStorage.getItem(JOIN_KEY) || readJoinCookie();
  return path.startsWith("/join") ? path : "";
}

export function clearJoinReturn() {
  localStorage.removeItem(JOIN_KEY);
  sessionStorage.removeItem(JOIN_KEY);
  document.cookie = `${JOIN_KEY}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function markPageReturn(path = herePath()) {
  if (!path.startsWith("/") || path === "/") return;
  localStorage.setItem(PAGE_KEY, JSON.stringify({ path, at: Date.now() }));
  document.cookie = `${PAGE_KEY}=${encodeURIComponent(path)}; Path=/; Max-Age=1200; SameSite=Lax`;
}

export function readPageReturn() {
  try {
    const data = JSON.parse(localStorage.getItem(PAGE_KEY) || "null");
    if (data?.path?.startsWith("/") && data.path !== "/" && Date.now() - Number(data.at) < 20 * 60 * 1000) return data.path;
  } catch {
    // Fall through to the cookie written for the wallet's return browser.
  }
  const match = document.cookie.match(new RegExp(`(?:^|; )${PAGE_KEY}=([^;]*)`));
  const path = match ? decodeURIComponent(match[1]) : "";
  return path.startsWith("/") && path !== "/" ? path : "";
}

export function clearPageReturn() {
  localStorage.removeItem(PAGE_KEY);
  document.cookie = `${PAGE_KEY}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function armBuyReturn(path = herePath()) {
  const target = path && path !== "/" ? path : "/#buy";
  sessionStorage.removeItem("mytree_sponsor_confirm");
  clearJoinReturn();
  markPageReturn(target);
  localStorage.setItem(BUY_KEY, JSON.stringify({ path: target, at: Date.now() }));
  document.cookie = `${BUY_KEY}=${encodeURIComponent(target)}; Path=/; Max-Age=180; SameSite=Lax`;
}

export function readBuyReturn() {
  try {
    const data = JSON.parse(localStorage.getItem(BUY_KEY) || "null");
    if (data?.path?.startsWith("/") && Date.now() - Number(data.at) < 3 * 60 * 1000) return data.path;
  } catch {
    // The wallet's other browser can only see the cookie.
  }
  const match = document.cookie.match(new RegExp(`(?:^|; )${BUY_KEY}=([^;]*)`));
  const path = match ? decodeURIComponent(match[1]) : "";
  return path.startsWith("/") && path !== "/" ? path : "";
}

export function clearBuyReturn() {
  localStorage.removeItem(BUY_KEY);
  document.cookie = `${BUY_KEY}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function takeDashboardRedirect() {
  const armed = sessionStorage.getItem(KEY) === "1";
  if (armed) sessionStorage.removeItem(KEY);
  return armed;
}
