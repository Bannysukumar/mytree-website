import { useEffect, useState } from "react";
import { httpsCallable } from "firebase/functions";
import { getAddress, zeroAddress } from "viem";
import { usePublicClient, useSwitchChain, useWriteContract } from "wagmi";
import { inrNotForTokens, targetChain, toTokenUnits, usdtTokenAddress } from "../lib/contractConfig";
import { functions } from "../lib/firebase";
import { explorerAddress, explorerTx, formatNumber, formatUsd, shortAddress } from "../lib/format";
import { readPendingBuy } from "../lib/pendingBuy";
import { runExclusive, runUsdtPurchase, walletBusy } from "../lib/runPurchase";
import { usePurchaseStatus } from "../hooks/usePurchaseStatus";
import { useReferralCode } from "../hooks/useReferralCode";
import { useSiteContent } from "../hooks/useSiteContent";
import { useTokenPrice } from "../hooks/useTokenPrice";
import { useWallet } from "../hooks/useWallet";
import { Check, Loader2 } from "lucide-react";
import { Badge, CountUp, Disclaimer, Progress } from "./ui";

export default function BuyWidget({ embedded = false }) {
  const { legal, sale, referral: referralConfig } = useSiteContent();
  const { address, isConnected, chain } = useWallet();
  const price = useTokenPrice();
  const referral = useReferralCode();
  const { writeContractAsync, isPending } = useWriteContract();
  const { switchChainAsync } = useSwitchChain();
  const publicClient = usePublicClient({ chainId: Number(sale?.chainId || 56) });
  const [usd, setUsd] = useState(25);
  const [hash, setHash] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const statusState = usePurchaseStatus(hash);
  const resolvedReferrer = referral.referrerWallet;

  let referrer = zeroAddress;
  if (resolvedReferrer && resolvedReferrer !== address?.toLowerCase()) {
    try {
      referrer = getAddress(resolvedReferrer);
    } catch {
      referrer = zeroAddress;
    }
  }
  const referred = referrer !== zeroAddress;
  const directPct = referred && referralConfig?.enabled !== false ? Number(referralConfig?.referrerBonusPercentage || 0) : 0;
  const upstreamPct = referred && referralConfig?.enabled !== false ? Number(referralConfig?.additionalLevels?.[0]?.percentage || 0) : 0;
  const buyerBonusPct = referred && referralConfig?.enabled !== false ? Number(referralConfig?.buyerBonusPercentage || 0) : 0;
  const tokens = price.priceUsd ? Number(usd) / price.priceUsd : 0;
  const directBonus = tokens * (directPct / 100);
  const upstreamBonus = tokens * (upstreamPct / 100);
  const buyerBonus = tokens * (buyerBonusPct / 100);
  const sold = price.tokensSold || 0;
  const cap = Number(sale?.roundSupply || 0);
  const remaining = price.tokensRemaining ?? Math.max(cap - sold, 0);
  const progress = cap ? Math.min(100, (sold / cap) * 100) : 0;
  const wrongChain = isConnected && chain?.id && sale?.chainId && chain.id !== Number(sale.chainId);
  const txLink = explorerTx(sale?.explorerUrl, statusState.hash);

  async function buy(resumeAmount) {
    const savedAmount = typeof resumeAmount === "bigint" || (typeof resumeAmount === "string" && /^\d+$/.test(resumeAmount)) ? resumeAmount : undefined;
    setError("");
    if (!isConnected) {
      setError("Connect a wallet first.");
      return;
    }
    if (!sale?.contractAddress) {
      setError("The sale contract address has not been published yet.");
      return;
    }
    if (!savedAmount && price.paused) {
      setError("The sale is paused.");
      return;
    }
    if (!savedAmount && (Number(usd) < Number(sale.minPurchaseUsd || 0) || Number(usd) > Number(sale.maxPurchaseUsd || Infinity))) {
      setError(`Purchase must be between $${sale.minPurchaseUsd} and $${sale.maxPurchaseUsd}.`);
      return;
    }
    if (!savedAmount && tokens > remaining) {
      setError("That amount is larger than the tokens left in this round.");
      return;
    }
    try {
      const chainId = targetChain(sale);
      const usdtAmount = savedAmount || toTokenUnits(usd, Number(sale.usdtDecimals || 18));
      const txHash = await runExclusive(() => runUsdtPurchase({
        writeContractAsync,
        publicClient,
        chainId,
        currentChainId: chain?.id,
        switchChainAsync,
        saleAddress: sale.contractAddress,
        usdtAddress: usdtTokenAddress(sale),
        buyer: address,
        amount: usdtAmount,
        referrer,
        resume: Boolean(savedAmount),
        onStatus: setNote,
      }));
      setHash(txHash);
      setNote("Purchase submitted. Confirm it in the wallet if it is still waiting.");
      if (functions) {
        const recorded = await httpsCallable(functions, "registerPendingPurchase")({
          txHash,
          buyer: address,
          referrer: referred ? referrer : "",
        });
        setNote(recorded.data?.status === "confirmed" ? "Purchase confirmed. Referral income is on the admin ledger." : "Purchase saved. It will appear on the admin page as soon as the network confirms it.");
      }
    } catch (err) {
      setNote("");
      setError(err.shortMessage || err.message || "The wallet rejected the purchase.");
    }
  }

  useEffect(() => {
    const pending = readPendingBuy();
    if (walletBusy() || !publicClient || !pending || !address || !sale?.contractAddress || !isConnected) return;
    if (pending.buyer?.toLowerCase() !== address.toLowerCase()) return;
    if (window.__mytreeBuyResume === pending.at) return;
    window.__mytreeBuyResume = pending.at;
    setNote("Wallet approved. Confirm the token transfer to finish the buy.");
    buy(BigInt(pending.amount));
  }, [publicClient, address, sale?.contractAddress, isConnected]);

  const status = statusState.status;

  const panel = (
        <div className="rounded-card border border-white/10 bg-moss p-6 shadow-card md:p-7">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-caption uppercase text-slate-400">Price</p>
              <p className="mt-1 font-display text-2xl tabular-nums text-foam">{price.priceInr ? `₹${formatNumber(price.priceInr, Number(price.priceInr) % 1 === 0 ? 0 : 2)}` : "—"} <span className="text-sm font-sans font-normal text-slate-400">{price.priceUsd ? `· ${formatUsd(price.priceUsd)} USDT` : "USDT"}</span></p>
            </div>
            <p className="text-right text-xs text-slate-400">USDT on BNB Smart Chain only</p>
          </div>
          <div className="mt-5">
            <Progress value={progress} label="Round sold" />
            <p className="mt-2 text-xs tabular-nums text-slate-400">{formatNumber(remaining)} left of {formatNumber(cap)}</p>
          </div>
          <label className="mt-6 block text-caption uppercase text-slate-400" htmlFor={embedded ? "usd-hero" : "usd"}>
            Amount in USDT
          </label>
          <input
            id={embedded ? "usd-hero" : "usd"}
            type="number"
            min="0"
            value={usd}
            onChange={(e) => setUsd(e.target.value)}
            className="mt-2 min-h-12 w-full rounded-control border border-white/10 bg-ink px-4 py-3 text-2xl tabular-nums text-foam outline-none focus:border-mint"
          />
          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-slate-400">Base $MYTREE</dt><dd className="tabular-nums"><CountUp value={tokens} format={(n) => formatNumber(n, 2)} /></dd></div>
            <div className="flex justify-between gap-4"><dt className="text-slate-400">You receive</dt><dd className="tabular-nums text-mint"><CountUp value={tokens + buyerBonus} format={(n) => formatNumber(n, 2)} /></dd></div>
            <div className="flex justify-between gap-4"><dt className="text-slate-400">Direct referrer</dt><dd className="tabular-nums">{referred ? `${formatNumber(directBonus, 2)} (${directPct}%)` : "—"}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-slate-400">Their referrer</dt><dd className="tabular-nums">{referred && upstreamPct ? `${formatNumber(upstreamBonus, 2)} (${upstreamPct}%)` : "—"}</dd></div>
          </dl>
          <button type="button" disabled={isPending} onClick={() => buy()} className="mt-6 flex min-h-11 w-full items-center justify-center gap-2 rounded-control bg-leaf py-3 font-semibold text-ink disabled:cursor-wait disabled:opacity-70">
            {isPending && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
            {status === "confirmed" && <Check size={16} aria-hidden="true" />}
            {isPending ? "Confirming in wallet…" : status === "confirmed" ? "Purchase confirmed" : "Buy now"}
          </button>
          {wrongChain && <p className="mt-3 text-sm text-sand">Switch to chain {sale.chainId} before paying. Buy will request the switch.</p>}
          {status && status !== "idle" && (
            <p className="mt-4 flex flex-wrap items-center gap-2">
              <Badge tone={status === "confirmed" || status === "success" ? "success" : status === "failed" ? "danger" : "warning"}>
                {status === "pending" ? "Pending" : status === "confirming" ? "Confirming" : status === "confirmed" ? "Success" : status === "failed" ? "Failed" : status}
              </Badge>
              {txLink && (
                <a className="text-xs text-mint underline" href={txLink} target="_blank" rel="noreferrer">View on explorer</a>
              )}
            </p>
          )}
          {note && <p className="mt-3 text-sm text-mint">{note}</p>}
          {error && <p className="mt-3 text-sm text-clay">{error}</p>}
          {referred && (
            <p className="mt-3 text-sm text-mint">Referred by {shortAddress(referrer)}. This purchase credits that wallet.</p>
          )}
          {sale?.contractAddress && (
            <p className="mt-3 break-all text-xs text-slate-400">
              Verify on BscScan:{" "}
              <a className="text-mint underline" href={explorerAddress(sale.explorerUrl || "https://bscscan.com", sale.contractAddress)} target="_blank" rel="noreferrer">
                presale {shortAddress(sale.contractAddress)}
              </a>
              {sale.tokenAddress && (
                <>
                  {" · "}
                  <a className="text-mint underline" href={explorerAddress(sale.explorerUrl || "https://bscscan.com", sale.tokenAddress)} target="_blank" rel="noreferrer">
                    mytree {shortAddress(sale.tokenAddress)}
                  </a>
                </>
              )}
            </p>
          )}
          <Disclaimer>{legal?.buy}</Disclaimer>
        </div>
  );

  if (embedded) return panel;

  return (
    <section id="how-to-buy" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-16">
      <div className="grid items-start gap-8 lg:grid-cols-[1fr_420px]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-mint">Buy $MYTREE</p>
          <h2 className="mt-3 font-display text-3xl text-foam md:text-5xl">Pay the published price. Bonuses only if a referral is real.</h2>
          <p className="mt-4 max-w-xl text-slate-300">
            Pay with USDT (BEP20) only. {inrNotForTokens} You receive the purchased $MYTREE immediately. A direct referrer can claim {directPct}% and their referrer can claim {upstreamPct}%. A claim sends only $MYTREE.
          </p>
          <ol className="mt-8 grid gap-3 sm:grid-cols-2">
            {[
              ["01", "Connect a wallet on BNB Smart Chain."],
              ["02", "Enter USDT and approve the BEP20 token."],
              ["03", "Confirm. Purchased tokens arrive in that transaction."],
              ["04", "Referral income is claimed later, as $MYTREE only."],
            ].map(([n, text]) => (
              <li key={n} className="rounded-xl border border-white/10 bg-[#1b2336] p-4">
                <p className="font-display text-2xl text-mint">{n}</p>
                <p className="mt-2 text-sm text-slate-300">{text}</p>
              </li>
            ))}
          </ol>
        </div>
        {panel}
      </div>
    </section>
  );
}
