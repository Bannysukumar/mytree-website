import { useState } from "react";
import { useWriteContract } from "wagmi";
import { presaleAbi, toTokenUnits } from "../lib/contractConfig";
import { saveDoc } from "../lib/adminApi";
import { useSiteContent } from "../hooks/useSiteContent";
import { SaveBar, Toast } from "./ui";

const input = "w-full rounded-xl border border-white/10 bg-ink px-3 py-2 text-sm aria-[invalid=true]:border-clay";
const numericKeys = new Set(["priceUsd", "priceInr", "nativeUsdRate", "minPurchaseUsd", "maxPurchaseUsd", "roundSupply", "tokensSold", "chainId", "usdtDecimals"]);

export default function SaleControls({ user }) {
  const { sale } = useSiteContent();
  const [draft, setDraft] = useState(null);
  const [message, setMessage] = useState("");
  const { writeContractAsync } = useWriteContract();
  const current = draft || sale || {};

  function set(key, value) {
    setDraft({ ...current, [key]: value });
  }

  async function save() {
    const payload = {
      ...current,
      priceUsd: Number(current.priceUsd),
      priceInr: Number(current.priceInr),
      nativeUsdRate: Number(current.nativeUsdRate),
      minPurchaseUsd: Number(current.minPurchaseUsd),
      maxPurchaseUsd: Number(current.maxPurchaseUsd),
      roundSupply: Number(current.roundSupply),
      tokensSold: Number(current.tokensSold || 0),
      chainId: Number(current.chainId),
      usdtDecimals: Number(current.usdtDecimals || 18),
      paused: Boolean(current.paused),
      timerEnabled: Boolean(current.timerEnabled),
      timerEndsAt: current.timerEndsAt || "",
      timerLabel: current.timerLabel || "",
      timerEndedText: current.timerEndedText || "",
    };
    delete payload.updatedAt;
    await saveDoc(user, "config", "sale", payload, "update:sale");
    setMessage("Sale settings saved in Firestore.");
  }

  async function call(functionName, args) {
    if (!current.contractAddress) {
      setMessage("Set a contract address first.");
      return;
    }
    const hash = await writeContractAsync({
      address: current.contractAddress,
      abi: presaleAbi,
      functionName,
      args,
    });
    setMessage(`${functionName} submitted: ${hash}`);
  }

  const decimals = Number(current.usdtDecimals || 18);
  let priceUnits = 0n;
  let minUnits = 0n;
  let maxUnits = 0n;
  try {
    priceUnits = toTokenUnits(current.priceUsd || 0, decimals);
    minUnits = toTokenUnits(current.minPurchaseUsd || 0, decimals);
    maxUnits = toTokenUnits(current.maxPurchaseUsd || 0, decimals);
  } catch {
    priceUnits = 0n;
  }

  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="font-display text-3xl">Token sale</h1>
      <p className="text-sm text-white/60">Display price lives in Firestore. Chain buttons below send owner transactions from the connected admin wallet. The scheduled function mirrors chain figures back into this document.</p>
      <div className="grid gap-3 md:grid-cols-2">
        {[
          ["priceUsd", "Price in USD"],
          ["priceInr", "Rupee value of 1 token (display)"],
          ["nativeUsdRate", "Display USD rate (not used for USDT buys)"],
          ["minPurchaseUsd", "Min purchase USD"],
          ["maxPurchaseUsd", "Max purchase USD"],
          ["roundSupply", "Round supply (tokens)"],
          ["tokensSold", "Tokens sold (display, until chain sync)"],
          ["chainId", "Chain id"],
          ["contractAddress", "Presale address"],
          ["tokenAddress", "Token address"],
          ["usdtAddress", "USDT BEP20 address"],
          ["usdtDecimals", "USDT decimals"],
          ["explorerUrl", "Explorer base URL"],
          ["paymentSymbol", "Payment symbol"],
        ].map(([key, label]) => (
          <label key={key} className="text-xs text-white/50">
            {label}
            <input className={`${input} mt-1`} aria-invalid={draft && numericKeys.has(key) && current[key] !== "" && Number.isNaN(Number(current[key]))} value={current[key] ?? ""} onChange={(e) => set(key, e.target.value)} />
            {draft && numericKeys.has(key) && current[key] !== "" && Number.isNaN(Number(current[key])) && <span className="mt-1 block text-clay">Enter a number.</span>}
          </label>
        ))}
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={Boolean(current.paused)} onChange={(e) => set("paused", e.target.checked)} />
        Show sale as paused in the UI
      </label>
      <div className="rounded-md border border-white/10 p-4 space-y-3">
        <h2 className="text-sm font-semibold">Presale timer</h2>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={Boolean(current.timerEnabled)} onChange={(e) => set("timerEnabled", e.target.checked)} />
          Show countdown on the home page
        </label>
        <label className="block text-xs text-white/50">
          Ends at
          <input className={`${input} mt-1`} type="datetime-local" value={toLocal(current.timerEndsAt)} onChange={(e) => set("timerEndsAt", e.target.value ? new Date(e.target.value).toISOString() : "")} />
        </label>
        <label className="block text-xs text-white/50">
          Label while running
          <input className={`${input} mt-1`} value={current.timerLabel || ""} onChange={(e) => set("timerLabel", e.target.value)} />
        </label>
        <label className="block text-xs text-white/50">
          Label after it ends
          <input className={`${input} mt-1`} value={current.timerEndedText || ""} onChange={(e) => set("timerEndedText", e.target.value)} />
        </label>
      </div>
      <p className="text-xs text-white/40">On-chain price for 1 token: {priceUnits.toString()} USDT units (18-decimal BEP20). Buys do not accept BNB, ETH, or INR.</p>
      <SaveBar dirty={Boolean(draft)} onSave={save} onCancel={() => { setDraft(null); setMessage(""); }} label="Save to Firestore" />
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => call("setPrice", [priceUnits])} className="rounded-full border border-white/15 px-4 py-2 text-sm">setPrice</button>
        <button type="button" onClick={() => call("setLimits", [minUnits, maxUnits])} className="rounded-full border border-white/15 px-4 py-2 text-sm">setLimits</button>
        <button type="button" onClick={() => call("pause", [])} className="rounded-full border border-white/15 px-4 py-2 text-sm">pause</button>
        <button type="button" onClick={() => call("unpause", [])} className="rounded-full border border-white/15 px-4 py-2 text-sm">unpause</button>
      </div>
      <Withdraw userAddress={current.treasuryAddress} onWithdraw={(to) => call("withdraw", [to])} />
      {sale?.chainSyncedAt && <p className="text-xs text-white/40">Chain cache present. Sold on chain: {sale.chainTokensSold || "—"}</p>}
      {message && <p className="text-sm text-mint" role="status">{message}</p>}
      <Toast message={message} />
    </div>
  );
}

function toLocal(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function Withdraw({ onWithdraw }) {
  const [to, setTo] = useState("");
  return (
    <div className="flex gap-2">
      <input className={input} placeholder="Address for accidental BNB withdrawal" value={to} onChange={(e) => setTo(e.target.value)} />
      <button type="button" onClick={() => onWithdraw(to)} className="shrink-0 rounded-full border border-white/15 px-4 text-sm">withdraw</button>
    </div>
  );
}
