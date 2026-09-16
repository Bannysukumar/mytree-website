import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { formatEther, getAddress, zeroAddress } from "viem";
import { usePublicClient, useReadContract, useSwitchChain, useWriteContract } from "wagmi";
import { Badge, CountUp, Progress, Skeleton } from "../components/ui";
import { Copy, ExternalLink } from "lucide-react";
import BrandMark from "../components/BrandMark";
import ConnectButton from "../components/ConnectButton";
import { useDashboardConfig } from "../hooks/useDashboardConfig";
import { useReferralCode } from "../hooks/useReferralCode";
import { useReferralStats } from "../hooks/useReferralStats";
import { useSiteContent } from "../hooks/useSiteContent";
import { useTokenPrice } from "../hooks/useTokenPrice";
import { useWallet } from "../hooks/useWallet";
import { erc20Abi, inrNotForTokens, isUsdtCurrency, presaleAbi, targetChain, toTokenUnits, usdtTokenAddress } from "../lib/contractConfig";
import { db, firebaseReady, functions } from "../lib/firebase";
import { explorerTx, formatNumber, formatUsd, shortAddress } from "../lib/format";
import { clearPageReturn } from "../lib/dashRedirect";
import { readPendingBuy } from "../lib/pendingBuy";
import { prepareWalletReturn } from "../lib/wagmi";
import { runUsdtPurchase } from "../lib/runPurchase";
import { childrenOf, currentRank, fill, inPeriod, nextMilestone, spendOf, visibleNav } from "../dashboard/stats";
import * as icons from "lucide-react";

function Icon({ name, size = 16 }) {
  const Cmp = icons[name] || icons.Circle;
  return <Cmp size={size} />;
}

function usePurchases() {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    if (!firebaseReady || !db) return undefined;
    const q = query(collection(db, "purchases"), orderBy("createdAt", "desc"), limit(200));
    return onSnapshot(q, (snap) => setRows(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }, []);
  return rows;
}

export default function Dashboard() {
  const { isConnected, address } = useWallet();
  const dash = useDashboardConfig(address);
  const navigate = useNavigate();
  const { section } = useParams();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [expanded, setExpanded] = useState({ transactions: true });
  const config = dash.config;
  const purchases = usePurchases();
  const view = section || "home";

  function setView(id) {
    setOpen(false);
    navigate(id && id !== "home" ? `/dashboard/${id}` : "/dashboard");
  }

  useEffect(() => {
    if (!config || !section) return undefined;
    const known = (config.nav || []).some((item) => item.id === section);
    if (!known) navigate("/dashboard", { replace: true });
    return undefined;
  }, [config, section, navigate]);

  if (!isConnected) {
    return (
      <div id="main" className="theme-dash mesh mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6">
        <p className="text-caption font-semibold uppercase text-mint">Dashboard</p>
        <p className="mt-3 font-display text-h1 text-foam">{config?.copy?.connectTitle || "Connect a wallet to continue"}</p>
        <p className="mt-3 text-slate-300">{config?.copy?.connectBody}</p>
        <div className="mt-8"><ConnectButton /></div>
      </div>
    );
  }

  const items = visibleNav(config);
  const active = items.some((item) => item.id === view) || (config?.nav || []).some((item) => item.id === view && item.visible !== false)
    ? view
    : "home";

    return (
    <div id="main" className="theme-dash dash-layout" data-collapsed={collapsed ? "true" : "false"}>
      <button type="button" className="m-3 inline-flex min-h-11 items-center gap-2 rounded-control border border-white/15 px-4 py-2 text-sm md:hidden" onClick={() => setOpen(true)}>
        <icons.Menu size={16} aria-hidden="true" /> Menu
      </button>
      {open && <button type="button" aria-label="Close menu" className="fixed inset-0 z-30 bg-black/60 md:hidden" onClick={() => setOpen(false)} />}
      <aside className={`${open ? "fixed inset-y-0 left-0 z-40 w-72" : "hidden"} app-sidebar p-3 md:sticky md:top-0 md:block md:h-screen md:overflow-y-auto`}>
        <div className="flex items-center justify-between gap-2 px-2">
          <a href="/" className="text-foam" aria-label="Mytree home">
            <BrandMark wordmark={!collapsed} />
          </a>
          <button type="button" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-control text-slate-400 md:hidden" onClick={() => setOpen(false)} aria-label="Close menu">
            <icons.X size={16} />
          </button>
          <button type="button" className="hidden min-h-11 min-w-11 items-center justify-center rounded-control text-slate-400 hover:bg-white/5 md:inline-flex" onClick={() => setCollapsed((v) => !v)} aria-pressed={collapsed} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
            <icons.PanelLeft size={16} />
          </button>
        </div>
        <nav className="mt-6 space-y-1" aria-label="Dashboard">
          {items.map((item) => {
            const kids = childrenOf(config, item.id);
            const group = { home: "Overview", referral: "Community", transactions: "Activity", profile: "Account" }[item.id];
            return (
            <div key={item.id}>
              {group && <p className="nav-group px-3 pb-1 pt-4 text-caption uppercase text-slate-500">{group}</p>}
              <NavButton
                item={item}
                active={active === item.id}
                collapsed={collapsed}
                open={Boolean(expanded[item.id])}
                hasChildren={kids.length > 0}
                onToggle={() => setExpanded((v) => ({ ...v, [item.id]: !v[item.id] }))}
                onClick={() => { setView(item.id); setOpen(false); }}
              />
              {expanded[item.id] && kids.map((child) => (
                <NavButton key={child.id} item={child} nested collapsed={collapsed} active={active === child.id} onClick={() => { setView(child.id); setOpen(false); }} />
              ))}
            </div>
            );
          })}
        </nav>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-white/10 bg-ink/80 px-4 py-3 backdrop-blur-md md:px-8">
          <p className="font-display text-lg text-foam">{items.find((item) => item.id === active)?.label || "Dashboard"}</p>
          <ConnectButton />
        </header>
      <main className="mx-auto w-full max-w-[1400px] px-4 py-8 md:px-8 md:py-10">
        {dash.loading && (
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-36" />
            <Skeleton className="h-36" />
            <Skeleton className="h-80" />
          </div>
        )}
        {!dash.loading && !config && <p className="text-sand">Dashboard settings are not in Firestore yet. Seed config/dashboard from the admin panel.</p>}
        {config && active === "home" && <HomeView config={config} address={address} purchases={purchases} onGo={setView} />}
        {config && (active === "buy" || active === "aftersale") && <BuyView config={config} mode={active} purchases={purchases} />}
        {config && active === "buyback" && <BuybackView config={config} address={address} />}
        {config && active === "referral" && <ReferralView config={config} />}
        {config && active === "leaderboard" && <LeaderView config={config} purchases={purchases} winners={dash.winners} />}
        {config && active === "claim" && <ClaimView config={config} purchases={purchases} address={address} />}
        {config && active === "mine" && <TxList title={config.copy?.mineTitle} rows={purchases.filter((row) => row.buyer === address?.toLowerCase())} empty={config.copy?.noTransactions} />}
        {config && active === "live" && <TxList title={config.copy?.liveTitle} rows={purchases} empty={config.copy?.noTransactions} />}
        {config && active === "transactions" && <TxList title={config.copy?.mineTitle} rows={purchases.filter((row) => row.buyer === address?.toLowerCase())} empty={config.copy?.noTransactions} />}
        {config && active === "profile" && <ProfileView config={config} address={address} purchases={purchases} />}
      </main>
      </div>
    </div>
  );
}

function NavButton({ item, active, nested, collapsed, hasChildren, open, onToggle, onClick }) {
  return (
    <div className={`flex items-center ${nested ? "ml-3" : ""}`}>
      <button type="button" onClick={onClick} data-active={active} title={collapsed ? item.label : undefined} className="app-nav-btn min-w-0 flex-1">
        <Icon name={item.icon} />
        <span className="nav-label flex-1 truncate">{item.label}</span>
        {item.badge && <span className="nav-badge rounded-full bg-sand px-2 py-0.5 text-[10px] font-semibold text-ink">{item.badge}</span>}
      </button>
      {hasChildren && (
        <button type="button" className="nav-label inline-flex h-11 w-8 items-center justify-center text-slate-400" aria-expanded={open} aria-label={`${open ? "Collapse" : "Expand"} ${item.label}`} onClick={onToggle}>
          <icons.ChevronDown size={14} className={`transition-transform ${open ? "" : "-rotate-90"}`} />
        </button>
      )}
    </div>
  );
}

function HomeView({ config, address, purchases, onGo }) {
  const price = useTokenPrice();
  const stats = spendOf(purchases, address, price.priceUsd);
  const { next } = nextMilestone(config.milestones, stats);
  const rank = currentRank(config.ranks, stats.spend);
  const tokenBalance = useTokenHolding(address, price.sale?.tokenAddress);
  const referral = useReferralStats();
  const copy = config.copy || {};
  async function copyAddress() {
    await navigator.clipboard.writeText(address);
  }
    return (
    <div className="space-y-6">
      <section className="glass rounded-card p-6 md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-caption uppercase text-slate-400">Milestones</p>
            <p className="mt-2 max-w-xl text-sm text-slate-300">{stats.count ? fill(copy.levelUp, { amount: formatUsd(Math.max(0, Number(next?.spendUsd || 0) - stats.spend)) }) : copy.streakStart}</p>
          </div>
          <button type="button" onClick={copyAddress} className="inline-flex min-h-11 items-center gap-2 rounded-control border border-white/10 px-3 text-sm text-mint">
            <Copy size={14} aria-hidden="true" /> {shortAddress(address)}
          </button>
        </div>
        <MilestoneStepper milestones={config.milestones} stats={stats} />
        <RankStepper rank={rank} />
      </section>
      <div className="grid items-start gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-8">
          <BuyPanel config={config} mode="buy" />
        </div>
        <div className="grid content-start gap-6 sm:grid-cols-2 xl:col-span-4 xl:grid-cols-1">
          <BalanceCard title={copy.balanceTitle} value={tokenBalance} address={address} explorer={price.sale?.explorerUrl} />
          <BalanceCard title={copy.referralTitle} value={referral.totalBonus} />
          {config.buyback?.enabled && <BuybackCard config={config} tokens={tokenBalance} participated={stats.count > 0} />}
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <TxList title={copy.mineTitle} rows={stats.mine.slice(0, 5)} empty={copy.noTransactions} />
        <ReferralView config={config} compact />
      </div>
      {(config.products || []).length > 0 && <Products config={config} address={address} />}
    </div>
  );
}

function Glyph({ value, size = 16 }) {
  const text = String(value || "");
  if (text.startsWith("http")) return <img src={text} alt="" className="h-5 w-5 rounded-full object-cover" />;
  if (/^[A-Za-z][A-Za-z0-9]+$/.test(text) && icons[text]) return <Icon name={text} size={size} />;
  return <icons.Award size={size} aria-hidden="true" />;
}

function RankBadge({ rank, current }) {
  if (!rank) return null;
  return (
    <div className={`flex items-center gap-2 rounded-control px-3 py-2 ${current ? "bg-mint/15 text-mint" : "bg-white/5 text-slate-300"}`}>
      <Glyph value={rank.icon} size={20} />
      <span className="text-sm">{rank.name}</span>
    </div>
  );
}

function MilestoneStepper({ milestones, stats }) {
  const rows = milestones || [];
  return (
    <ol className="dash-step mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {rows.map((tier, index) => {
        const done = stats.spend >= Number(tier.spendUsd) && stats.count >= Number(tier.purchaseCount);
        const previous = rows[index - 1];
        const previousDone = !previous || (stats.spend >= Number(previous.spendUsd) && stats.count >= Number(previous.purchaseCount));
        const current = !done && previousDone;
        return (
          <li key={tier.id} className={`relative rounded-card border bg-ink/50 px-4 py-4 ${done ? "border-mint/50" : current ? "border-mint" : "border-white/10"}`}>
            <span className={`mb-3 inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${done ? "bg-leaf text-ink" : current ? "bg-mint/20 text-mint" : "bg-white/10 text-slate-400"}`} aria-hidden="true">
              {done ? <icons.Check size={14} /> : index + 1}
            </span>
            <p className="text-sm font-medium text-foam">{tier.badge}</p>
            <p className="mt-1 text-xs tabular-nums text-slate-400">{formatUsd(tier.spendUsd)} · {tier.purchaseCount} buys</p>
            <p className="mt-2 text-caption uppercase text-slate-500">{done ? "Cleared" : current ? "Current" : "Next"}</p>
          </li>
        );
      })}
    </ol>
  );
}

function RankStepper({ rank }) {
  const rows = rank.rows || [];
  return (
    <div className="mt-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <RankBadge rank={rank.current} current />
        <p className="text-xs text-slate-400">{rank.next ? `Next: ${rank.next.name} at ${formatUsd(rank.next.spendUsd)}` : rank.current?.name}</p>
      </div>
      <ol className="grid gap-2 sm:grid-cols-4">
        {rows.map((item) => {
          const reached = Number(rank.current?.spendUsd || 0) >= Number(item.spendUsd || 0);
          const isCurrent = rank.current?.id === item.id;
          return (
            <li key={item.id} className={`rounded-control border px-3 py-3 text-sm ${isCurrent ? "border-mint bg-mint/10 text-foam" : reached ? "border-white/10 text-slate-200" : "border-white/5 text-slate-500"}`}>
              <Glyph value={item.icon} size={16} />
              <p className="mt-2 font-medium">{item.name}</p>
              <p className="text-xs tabular-nums">{formatUsd(item.spendUsd)}</p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function useTokenHolding(address, token) {
  const { data } = useReadContract({
    address: token || undefined,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address && token) },
  });
  if (!data) return 0;
  return Number(data) / 1e18;
}

function BalanceCard({ title, value, address, explorer }) {
  return (
    <article className="glass flex h-full flex-col rounded-card p-6">
      <p className="text-caption uppercase text-slate-400">{title}</p>
      <p className="mt-4 font-display text-4xl tabular-nums text-mint"><CountUp value={value} format={(n) => formatNumber(n, 2)} /></p>
      {address && (
        <div className="mt-auto flex gap-3 pt-5 text-xs">
          <button type="button" onClick={() => navigator.clipboard.writeText(address)} className="inline-flex min-h-11 items-center gap-1 text-slate-300"><Copy size={12} aria-hidden="true" /> Copy</button>
          {explorer && <a className="inline-flex min-h-11 items-center gap-1 text-mint" href={`${explorer.replace(/\/$/, "")}/address/${address}`} target="_blank" rel="noreferrer">Explorer <ExternalLink size={12} aria-hidden="true" /></a>}
        </div>
      )}
    </article>
  );
}

function BuybackCard({ config, tokens, participated }) {
  const rate = Number(config.buyback?.rateUsd || 0);
  return (
    <article className="glass flex h-full flex-col rounded-card p-6">
      <p className="text-caption uppercase text-slate-400">{config.copy?.buybackTitle}</p>
      <p className="mt-4 font-display text-4xl">{formatUsd(tokens * rate)}</p>
      <p className="text-sm text-white/60">{formatUsd(rate)} / token</p>
      {!participated && <p className="mt-3 text-sm text-sand">{config.copy?.buybackCta}</p>}
      {config.buyback?.beta && <p className="mt-3 text-xs text-sand">{config.copy?.betaNote}</p>}
      <p className="mt-2 text-xs text-white/45">{config.buyback?.disclaimer}</p>
    </article>
  );
}

function BuyView({ config, mode }) {
  return <BuyPanel config={config} mode={mode} />;
}

function BuyPanel({ config, mode }) {
  const price = useTokenPrice();
  const { address, isConnected, chain, balance } = useWallet();
  const referral = useReferralCode();
  const { referral: referralConfig } = useSiteContent();
  const { writeContractAsync, isPending } = useWriteContract();
  const { switchChainAsync } = useSwitchChain();
  const publicClient = usePublicClient({ chainId: Number(price.sale?.chainId || 56) });
  const [currencyId, setCurrencyId] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState("");
  const [code, setCode] = useState("");
  const [applied, setApplied] = useState(null);
  const [error, setError] = useState("");
  const [showOther, setShowOther] = useState(false);
  const copy = config.copy || {};
  const products = config.products || [];
  const [tab, setTab] = useState("token");
  const publishedUsdt = (config.currencies || []).filter((row) => row.enabled !== false && isUsdtCurrency(row));
  const currencies = publishedUsdt.length
    ? publishedUsdt
    : [{ id: "USDT", symbol: "USDT", kind: "token", min: Number(price.sale?.minPurchaseUsd || 1), usdRate: 1, enabled: true, featured: true }];
  const featured = currencies.filter((row) => row.featured !== false);
  const extra = currencies.filter((row) => row.featured === false);
  const currency = currencies.find((row) => row.id === (currencyId || featured[0]?.id)) || featured[0];
  const unitPrice = mode === "aftersale" ? Number(config.aftersale?.priceUsd || price.priceUsd) : Number(price.priceUsd || 0);
  const quote = useMemo(() => {
    const usd = Number(amount || 0) * Number(currency?.usdRate || 0);
    const discounted = applied?.type === "price" ? usd * (1 - Number(applied.value) / 100) : usd;
    let tokens = unitPrice ? discounted / unitPrice : 0;
    if (applied?.type === "bonus") tokens *= 1 + Number(applied.value) / 100;
    return { usd: discounted, tokens };
  }, [amount, currency, unitPrice, applied]);

  function applyCode() {
    const found = (config.promoCodes || []).find((row) => String(row.code).toUpperCase() === code.trim().toUpperCase());
    const expired = found?.expiresAt && Date.parse(found.expiresAt) < Date.now();
    const capped = found?.usageCap && Number(found.used || 0) >= Number(found.usageCap);
    if (!found || found.active === false || expired || capped) {
      setApplied(null);
      setError(copy.promoInvalid);
      return;
    }
    setApplied(found);
    setError(copy.promoApplied);
  }

  async function buy(resume) {
    setError("");
    const sale = price.sale;
    if (!sale?.contractAddress || !address) return;
    if (!resume) {
      if (!isUsdtCurrency(currency)) {
        setError(inrNotForTokens);
        return;
      }
      if (!saleReady(price, quote)) {
        setError("Enter a USDT amount at or above the published minimum.");
        return;
      }
    }
    let referrer = zeroAddress;
    if (referral.referrerWallet && referral.referrerWallet !== address?.toLowerCase()) {
      try { referrer = getAddress(referral.referrerWallet); } catch { referrer = zeroAddress; }
    }
    const usdtAmount = resume?.amount ? BigInt(resume.amount) : toTokenUnits(amount, Number(sale.usdtDecimals || 18));
    const sponsor = resume?.referrer ? getAddress(resume.referrer) : referrer;
    try {
      const hash = await runUsdtPurchase({
        writeContractAsync,
        publicClient,
        chainId: targetChain(sale),
        currentChainId: chain?.id,
        switchChainAsync,
        saleAddress: sale.contractAddress,
        usdtAddress: usdtTokenAddress(sale),
        buyer: address,
        amount: usdtAmount,
        referrer: sponsor,
        resume: Boolean(resume),
        onStatus: setStatus,
      });
      setStatus("Purchase submitted. Tokens transfer when this transaction confirms.");
      if (functions) {
        const recorded = await httpsCallable(functions, "registerPendingPurchase")({ txHash: hash, buyer: address, referrer: sponsor === zeroAddress ? "" : sponsor, promoCode: applied?.code || "" });
        setStatus(recorded.data?.status === "confirmed" ? "Purchase confirmed. Referral income is on the admin ledger." : "Purchase saved. It will appear on the admin page as soon as the network confirms it.");
      }
    } catch (err) {
      setStatus("");
      setError(err.shortMessage || err.message || "Wallet rejected the purchase.");
    }
  }

  useEffect(() => {
    const pending = readPendingBuy();
    if (!publicClient || !pending || !address || !price.sale?.contractAddress) return;
    if (pending.buyer?.toLowerCase() !== address.toLowerCase()) return;
    if (pending.saleAddress?.toLowerCase() !== price.sale.contractAddress.toLowerCase()) return;
    if (window.__mytreeBuyResume === pending.at) return;
    window.__mytreeBuyResume = pending.at;
    setStatus("Wallet approved. Confirm the token transfer to finish the buy.");
    buy(pending);
  }, [address, price.sale?.contractAddress, publicClient]);

  const sold = price.tokensSold || 0;
  const cap = Number(price.sale?.roundSupply || 0);
  const remaining = price.tokensRemaining ?? Math.max(cap - sold, 0);
  const nextStage = (config.stages || [])[0];

  return (
    <section className="glass rounded-card p-6 md:p-7">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setTab("token")} className={`min-h-11 rounded-control px-4 text-sm ${tab === "token" ? "bg-leaf font-semibold text-ink" : "bg-white/5"}`}>{copy.buyTab}</button>
        {products.length > 0 && (
          <button type="button" onClick={() => setTab("kit")} className={`min-h-11 rounded-control px-4 text-sm ${tab === "kit" ? "bg-leaf font-semibold text-ink" : "bg-white/5"}`}>{config.salePanel?.impactTabLabel}</button>
        )}
      </div>
      {tab === "kit" ? <Products config={config} address={address} /> : (
        <div className="mt-6 space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-caption uppercase text-slate-400">Price</p>
              <p className="mt-1 font-display text-3xl tabular-nums text-mint">{formatUsd(unitPrice)}</p>
            </div>
            <p className="text-sm text-slate-400">{mode === "aftersale" ? config.aftersale?.batchLabel : config.salePanel?.batchLabel}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <p className="text-sm text-slate-400">Tokens sold <span className="tabular-nums text-foam">{formatNumber(sold)}</span></p>
            <p className="text-sm text-slate-400">Raised <span className="tabular-nums text-foam">{formatUsd(sold * unitPrice)}</span></p>
          </div>
          <Progress value={cap ? Math.min(100, (sold / cap) * 100) : 0} label="Round sold" />
          <p className="text-xs tabular-nums text-slate-400">{formatNumber(remaining)} $MYTREE remaining</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-card bg-white/5 p-4"><p className="text-caption uppercase text-slate-400">Current</p><p className="mt-1 text-xl tabular-nums text-mint">{formatUsd(unitPrice)}</p></div>
            <div className="rounded-card bg-white/5 p-4"><p className="text-caption uppercase text-slate-400">{nextStage?.label || "Next stage"}</p><p className="mt-1 text-xl tabular-nums">{formatUsd(nextStage?.priceUsd || config.salePanel?.nextStagePriceUsd || 0)}</p></div>
          </div>
          <div className="flex flex-wrap gap-2">
            {featured.map((row) => (
              <button key={row.id} type="button" onClick={() => setCurrencyId(row.id)} className={`inline-flex min-h-11 items-center gap-1 rounded-control px-3 text-sm ${currency?.id === row.id ? "bg-mint font-semibold text-ink" : "bg-white/5"}`}><Glyph value={row.icon} size={14} /> {row.symbol}</button>
            ))}
            {extra.length > 0 && <button type="button" className="min-h-11 px-2 text-sm text-mint" onClick={() => setShowOther((v) => !v)}>{copy.otherCryptos}</button>}
          </div>
          {showOther && (
            <div className="mt-2 flex flex-wrap gap-2">
              {extra.map((row) => (
                <button key={row.id} type="button" onClick={() => setCurrencyId(row.id)} className="rounded-full bg-white/5 px-3 py-1 text-sm"><span className="inline-flex items-center gap-1"><Glyph value={row.icon} size={14} /> {row.symbol}</span></button>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" aria-label="USDT amount" className="min-h-12 flex-1 rounded-control border border-white/10 bg-ink px-4 py-3 text-2xl tabular-nums" />
            <button type="button" className="min-h-12 rounded-control border border-white/15 px-4 text-sm" onClick={() => setAmount(String(maxAmount(balance, currency)))}>{copy.max || "MAX"}</button>
          </div>
          <p className="text-xs text-slate-400">{copy.minLabel} {price.sale?.minPurchaseUsd ?? currency?.min} {currency?.symbol}</p>
          <p className="text-sm">{copy.worthLabel}: <span className="tabular-nums text-mint"><CountUp value={quote.tokens} format={(n) => formatNumber(n, 2)} /></span></p>
          {(referral.referrerWallet || referral.landingCode) && (
            <p className="mt-1 text-sm text-mint">
              Referred by {referral.referrerWallet ? shortAddress(referral.referrerWallet) : referral.landingCode}. A buy from this wallet credits that referrer.
            </p>
          )}
          <p className="mt-1 text-xs text-slate-400">
            USDT (BEP20) is the only way to buy. {inrNotForTokens} Purchased tokens arrive immediately. Referral income is paid once, on this wallet’s first purchase, and only to a sponsor who has already bought: {referralConfig?.referrerBonusPercentage ?? 10}% for the direct referrer and {referralConfig?.additionalLevels?.[0]?.percentage ?? 5}% for the person above them. Later buys do not pay referral income again.
          </p>
          <div className="flex gap-2">
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder={copy.promoLabel} aria-label={copy.promoLabel} className="min-h-11 flex-1 rounded-control border border-white/10 bg-ink px-4 text-sm" />
            <button type="button" onClick={applyCode} className="min-h-11 rounded-control border border-white/15 px-4 text-sm">{copy.apply}</button>
          </div>
          <button type="button" disabled={isPending || !saleReady(price, quote) || !isConnected} onClick={buy} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-control bg-leaf py-3 font-semibold text-ink disabled:bg-white/10 disabled:text-white/40">
            {isPending && <icons.Loader2 size={16} className="animate-spin" aria-hidden="true" />}
            {isPending ? "Waiting for wallet…" : copy.buyCta}
          </button>
          {status && <p className="mt-3 text-sm text-mint">{status}</p>}
          {error && <p className="mt-3 text-sm text-sand">{error}</p>}
        </div>
      )}
    </section>
  );
}

function saleReady(price, quote) {
  const amount = Number(quote.usd);
  const min = Number(price.sale?.minPurchaseUsd || 0);
  const max = Number(price.sale?.maxPurchaseUsd || 0);
  return Boolean(price.sale?.contractAddress) && amount > 0 && amount >= min && (!max || amount <= max);
}

function maxAmount(balance, currency) {
  if (!currency || currency.kind !== "native") return "";
  return Number(balance?.formatted || 0).toFixed(6);
}

function DownlineList({ rows }) {
  return (
    <div className="mt-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">All downlines</p>
      {!rows.length ? (
        <p className="mt-3 text-sm text-slate-400">No one has joined with your link yet. When they do, they show here as Not bought until they purchase.</p>
      ) : (
        <ul className="mt-3 divide-y divide-white/10 rounded-card border border-white/10">
          {rows.map((row) => (
            <li key={row.wallet} className="flex flex-wrap items-center justify-between gap-3 px-3 py-3">
              <div>
                <p className="break-all text-sm text-foam">{row.wallet}</p>
                <p className="mt-1 text-xs text-slate-400">{row.level === 1 ? "Direct referral" : "Their referral"}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${row.bought ? "bg-mint/15 text-mint" : "bg-sand/15 text-sand"}`}>
                {row.bought ? `Bought${row.tokens ? ` · ${formatNumber(row.tokens, 2)}` : ""}` : "Not bought"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ContractUpliner({ address }) {
  const { sale } = useSiteContent();
  const upliner = useReadContract({
    address: sale?.contractAddress,
    abi: presaleAbi,
    functionName: "referrerOf",
    args: address ? [getAddress(address)] : undefined,
    chainId: Number(sale?.chainId || 56),
    query: { enabled: Boolean(address && sale?.contractAddress) },
  });
  const bound = upliner.data && upliner.data !== zeroAddress ? upliner.data : "";
  return (
    <div className="mt-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Upliner wallet on contract</p>
      {bound ? (
        <>
          <p className="mt-1 break-all rounded-control border border-mint/40 bg-ink px-3 py-3 text-sm text-foam">{bound}</p>
          <p className="mt-2 text-sm text-mint">Read from the sale contract. This binding cannot be changed.</p>
        </>
      ) : (
        <p className="mt-2 text-sm text-sand">No upliner is bound on the contract yet. A buy will not pay a sponsor until Confirm sponsor is approved.</p>
      )}
    </div>
  );
}

function ReferralView({ config, compact }) {
  const { address, isConnected } = useWallet();
  const { shareLink } = useReferralCode();
  const stats = useReferralStats();
  const link = shareLink;
  return (
    <section className={`rounded-card p-6 ${compact ? "glass" : ""}`}>
      <h2 className={`font-display text-foam ${compact ? "text-xl" : "text-h2"}`}>{config.copy?.yourReferrals}</h2>
      {isConnected && (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Your wallet</p>
          <p className="mt-1 break-all text-sm text-foam">{address}</p>
        </div>
      )}
      <ContractUpliner address={address} />
      {link && (
        <div className="mt-5 space-y-2 text-sm">
          <p className="text-slate-400">Your unique link is your wallet address.</p>
          <p className="break-all text-mint">{link}</p>
          <button type="button" onClick={() => navigator.clipboard.writeText(link)} className="min-h-11 rounded-control border border-white/15 px-3 text-xs">Copy link</button>
        </div>
      )}
      <div className="mt-5 space-y-3 text-sm">
        <p className="flex justify-between"><span className="text-slate-400">Downlines</span> <span className="tabular-nums text-mint">{stats.referralCount}</span></p>
        <p className="flex justify-between"><span className="text-slate-400">Earned</span> <span className="tabular-nums text-mint">{formatNumber(stats.totalBonus, 2)} $MYTREE</span></p>
      </div>
      <DownlineList rows={stats.downlines || []} />
    </section>
  );
}

function LeaderView({ config, purchases, winners }) {
  const [mode, setMode] = useState("all");
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState(false);
  const board = config.leaderboard || {};
  const size = Number(board.pageSize || 10);
  const rows = useMemo(() => {
    const grouped = {};
    purchases.filter((row) => row.status === "confirmed" && inPeriod(row, mode)).forEach((row) => {
      const id = row.buyer;
      if (!id) return;
      grouped[id] = grouped[id] || { wallet: id, volume: 0, spend: 0 };
      grouped[id].volume += Number(row.tokensWhole || 0);
      grouped[id].spend += Number(row.amountUsd || 0);
    });
    const key = board.criteria === "spendUsd" ? "spend" : "volume";
    return Object.values(grouped).sort((a, b) => b[key] - a[key]);
  }, [purchases, mode, board.criteria]);
  const slice = rows.slice(page * size, page * size + size);
  const resetAt = board.resetAt ? Date.parse(board.resetAt) : 0;
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const left = resetAt > now ? resetAt - now : 0;
  return (
    <section>
      <div className="flex flex-wrap gap-2">
        {["daily", "monthly", "all"].map((id) => (
          <button key={id} type="button" onClick={() => { setMode(id); setPage(0); }} className={`min-h-11 rounded-control px-4 text-sm capitalize ${mode === id ? "bg-leaf font-semibold text-ink" : "bg-white/5"}`}>{id === "all" ? "All-time" : id}</button>
        ))}
      </div>
      <div className="mt-6 rounded-card border border-white/10 bg-moss p-6">
        <p className="text-caption uppercase text-slate-400">{config.copy?.rewardPool}</p>
        <p className="mt-2 font-display text-4xl tabular-nums text-foam">{formatNumber(board.poolAmount)} {board.poolCurrency}</p>
        <p className="mt-1 text-sm text-slate-400">{board.resetLabel}</p>
        {left > 0 && <Countdown ms={left} />}
        <button type="button" className="mt-4 min-h-11 text-sm text-mint" onClick={() => setOpen(true)}>{config.copy?.viewWinners}</button>
      </div>
      <ol className="mt-6 space-y-2">
        {slice.map((row, index) => {
          const rank = page * size + index + 1;
          const prize = (board.prizes || []).find((item) => Number(item.rank) === rank);
          return (
            <li key={row.wallet} className={`flex items-center gap-4 rounded-card px-4 py-3 text-sm ${rank === 1 ? "border border-mint/40 bg-mint/10" : "bg-white/5"}`}>
              <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-display ${rank === 1 ? "bg-leaf text-ink" : "bg-white/10 text-slate-300"}`} aria-label={`Rank ${rank}`}>
                {rank === 1 ? <icons.Trophy size={16} aria-hidden="true" /> : rank}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-foam">{shortAddress(row.wallet)}</span>
                <span className="text-xs tabular-nums text-slate-400">{formatNumber(board.criteria === "spendUsd" ? row.spend : row.volume, 2)}</span>
              </span>
              <span className={`tabular-nums ${rank === 1 ? "font-display text-xl text-mint" : "text-slate-300"}`}>{prize ? formatNumber(prize.amount) : "—"}</span>
            </li>
          );
        })}
      </ol>
      <div className="mt-4 flex gap-2">
        <button type="button" disabled={page === 0} onClick={() => setPage((n) => n - 1)} className="min-h-11 rounded-control border border-white/15 px-4 text-sm disabled:opacity-40">Prev</button>
        <button type="button" disabled={(page + 1) * size >= rows.length} onClick={() => setPage((n) => n + 1)} className="min-h-11 rounded-control border border-white/15 px-4 text-sm disabled:opacity-40">Next</button>
      </div>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md rounded-card bg-pine p-6" onClick={(e) => e.stopPropagation()}>
            <p className="font-display text-2xl">{config.copy?.viewWinners}</p>
            <ul className="mt-3 space-y-2 text-sm">
              {winners.map((row) => <li key={row.id}>{row.period} · #{row.rank} {shortAddress(row.wallet)} · {row.prize}</li>)}
              {!winners.length && <li className="text-white/50">No past results published yet.</li>}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}

function Countdown({ ms }) {
  const s = Math.floor(ms / 1000);
  const parts = [
    ["Days", Math.floor(s / 86400)],
    ["Hours", Math.floor((s % 86400) / 3600)],
    ["Min", Math.floor((s % 3600) / 60)],
    ["Sec", s % 60],
  ];
  return (
    <div className="mt-4 flex flex-wrap gap-2" aria-label="Time remaining">
      {parts.map(([label, value]) => (
        <div key={label} className="min-w-[4.5rem] rounded-control bg-ink px-3 py-2 text-center">
          <p className="font-display text-2xl tabular-nums text-foam">{String(value).padStart(2, "0")}</p>
          <p className="text-caption uppercase text-slate-400">{label}</p>
        </div>
      ))}
    </div>
  );
}

function txStamp(row) {
  const ms = row.createdAt?.toMillis?.() || Date.parse(row.createdAt || 0) || 0;
  if (!ms) return "—";
  return new Date(ms).toLocaleString();
}

function statusTone(status) {
  if (status === "confirmed" || status === "success") return "success";
  if (status === "failed") return "danger";
  return "warning";
}

function TxList({ title, rows, empty }) {
  const price = useTokenPrice();
  const finalized = (rows || []).filter((row) => ["confirmed", "success", "failed", "pending", "confirming"].includes(row.status));
  return (
    <section className="glass rounded-card p-6">
      <h2 className="font-display text-xl text-foam">{title}</h2>
      {!finalized.length && <p className="mt-4 text-sm text-slate-400">{empty}</p>}
      {finalized.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-[640px] text-left text-sm">
            <thead>
              <tr className="text-caption uppercase text-slate-400">
                <th>Transaction</th>
                <th>Status</th>
                <th>When</th>
                <th>Explorer</th>
              </tr>
            </thead>
            <tbody>
              {finalized.slice(0, 8).map((row) => {
                const link = explorerTx(price.sale?.explorerUrl, row.txHash);
                return (
                  <tr key={row.id} className="border-t border-white/10">
                    <td className="tabular-nums text-foam">{shortAddress(row.txHash || row.buyer)}</td>
                    <td><Badge tone={statusTone(row.status)}>{row.status}</Badge></td>
                    <td className="text-slate-400">{txStamp(row)}</td>
                    <td>
                      {link ? (
                        <a className="inline-flex min-h-11 items-center gap-1 text-mint" href={link} target="_blank" rel="noreferrer">Explorer <ExternalLink size={12} aria-hidden="true" /></a>
                      ) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function ClaimView({ config, address }) {
  const { sale } = useSiteContent();
  const { writeContractAsync, isPending } = useWriteContract();
  const { switchChainAsync } = useSwitchChain();
  const { chain } = useWallet();
  const [error, setError] = useState("");
  const [hash, setHash] = useState("");
  const [status, setStatus] = useState("");
  const enabled = Boolean(sale?.contractAddress && address);
  const claimable = useReadContract({
    address: sale?.contractAddress,
    abi: presaleAbi,
    functionName: "claimable",
    args: address ? [address] : undefined,
    chainId: Number(sale?.chainId || 56),
    query: { enabled },
  });
  const amount = claimable.data || 0n;
  const ready = amount > 0n;

  useEffect(() => {
    prepareWalletReturn();
    function refresh() {
      if (document.visibilityState === "visible") claimable.refetch();
    }
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("pageshow", refresh);
    return () => {
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("pageshow", refresh);
    };
  }, [claimable.refetch]);

  async function claim() {
    setError("");
    setStatus("Approve the claim in your wallet. You will stay on this page.");
    try {
      await prepareWalletReturn({ persist: true });
      const chainId = targetChain(sale);
      if (chain?.id !== chainId) await switchChainAsync({ chainId });
      await prepareWalletReturn({ persist: true });
      const tx = await writeContractAsync({
        address: sale.contractAddress,
        abi: presaleAbi,
        functionName: "claim",
        chainId,
      });
      setHash(tx);
      setStatus("Claim submitted. The tokens move when this transaction confirms.");
      clearPageReturn();
      claimable.refetch();
    } catch (err) {
      setStatus("");
      setError(err.shortMessage || err.message || "Wallet rejected the claim.");
    }
  }

  return (
    <section className="glass max-w-xl rounded-card p-7">
      <h2 className="font-display text-h2 text-foam">{config.copy?.claimTitle}</h2>
      <p className="mt-3 text-slate-300">Referral income is claimable $MYTREE. Claiming sends only tokens to this wallet. USDT is never sent, and INR donations never earn a claim.</p>
      <p className="mt-6 font-display text-4xl tabular-nums text-mint">{formatNumber(Number(formatEther(amount)), 4)} $MYTREE</p>
      <p className="mt-4 text-sm text-slate-400">{ready ? "Claim transfers these tokens now." : "Nothing to claim yet."}</p>
      <button type="button" disabled={!ready || isPending || !address} onClick={claim} className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-control bg-leaf px-5 py-2 font-semibold text-ink disabled:bg-white/10 disabled:text-white/40">
        {isPending && <icons.Loader2 size={16} className="animate-spin" aria-hidden="true" />}
        {isPending ? "Waiting for wallet…" : "Claim tokens"}
      </button>
      {status && <p className="mt-4 text-sm text-mint">{status}</p>}
      {hash && <p className="mt-4 break-all text-xs text-slate-400">{hash}</p>}
      {error && <p className="mt-3 text-sm text-clay">{error}</p>}
    </section>
  );
}

function Products({ config, address }) {
  const { ownership } = useDashboardConfig(address);
  return (
    <section className="mt-4">
      <h2 className="font-display text-2xl">{config.copy?.productsTitle}</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(config.products || []).map((item) => {
          const owned = (ownership || []).find((row) => row.productId === item.id);
          return (
            <article key={item.id} className="rounded-3xl bg-white/5 p-4">
              {item.image && <img src={item.image} alt="" className="h-32 w-full rounded-2xl object-cover" />}
              <h3 className="mt-3 font-display text-xl">{item.name}</h3>
              <p className="text-sm text-white/60">{item.description}</p>
              <p className="mt-2 text-xs text-mint">Owned: {owned?.units || 0}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function ProfileView({ config, address, purchases }) {
  const price = useTokenPrice();
  const stats = spendOf(purchases, address, price.priceUsd);
  const rank = currentRank(config.ranks, stats.spend);
  const { disconnect } = useWallet();
  return (
    <section className="glass max-w-xl rounded-card p-7">
      <h2 className="font-display text-h2 text-foam">Profile</h2>
      <p className="mt-3 break-all text-sm text-mint">{address}</p>
      <div className="mt-4"><RankBadge rank={rank.current} /></div>
      <p className="mt-3 text-sm text-white/60">{formatNumber(stats.count)} purchases · {formatUsd(stats.spend)}</p>
      <button type="button" onClick={() => disconnect()} className="mt-6 min-h-11 rounded-control border border-white/15 px-4 text-sm">Disconnect</button>
    </section>
  );
}

function BuybackView({ config, address }) {
  const price = useTokenPrice();
  const tokens = useTokenHolding(address, price.sale?.tokenAddress);
  return <BuybackCard config={config} tokens={tokens} participated={false} />;
}
