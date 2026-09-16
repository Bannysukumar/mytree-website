import { useState } from "react";
import { erc20Abi, formatUnits, isAddress, parseUnits } from "viem";
import { useReadContract, useWriteContract } from "wagmi";
import { useSiteContent } from "../hooks/useSiteContent";
import { useWallet } from "../hooks/useWallet";
import { presaleAbi, targetChain } from "../lib/contractConfig";
import { shortAddress } from "../lib/format";
import { Toast } from "./ui";

const input = "w-full px-3 py-2 text-sm";

export default function TreasuryControls() {
  const { sale } = useSiteContent();
  const { address, chain } = useWallet();
  const presale = sale?.contractAddress;
  const chainId = targetChain(sale);
  const enabled = Boolean(presale && isAddress(presale));
  const { data: owner } = useReadContract({
    address: enabled ? presale : undefined,
    abi: presaleAbi,
    functionName: "owner",
    chainId,
    query: { enabled },
  });
  const { data: tokenOnChain } = useReadContract({
    address: enabled ? presale : undefined,
    abi: presaleAbi,
    functionName: "token",
    chainId,
    query: { enabled },
  });
  const { data: usdtOnChain } = useReadContract({
    address: enabled ? presale : undefined,
    abi: presaleAbi,
    functionName: "usdt",
    chainId,
    query: { enabled },
  });
  const { data: reserved } = useReadContract({
    address: enabled ? presale : undefined,
    abi: presaleAbi,
    functionName: "rewardsAllocated",
    chainId,
    query: { enabled },
  });
  const { data: claimed } = useReadContract({
    address: enabled ? presale : undefined,
    abi: presaleAbi,
    functionName: "rewardsPaid",
    chainId,
    query: { enabled },
  });

  const token = tokenOnChain || sale?.tokenAddress;
  const usdt = usdtOnChain || sale?.usdtAddress;
  const ownerMatch = owner && address && owner.toLowerCase() === address.toLowerCase();
  const unclaimed = reserved !== undefined && claimed !== undefined ? reserved - claimed : undefined;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Admin only</p>
        <h1 className="mt-1 font-display">Treasury</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">Contract balances are read on-chain and shown only in this admin page. Users never see this screen. Deposit and withdraw require the owner wallet.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <BalanceCard
          label="$MYTREE in contract"
          token={token}
          presale={presale}
          decimals={18}
          chainId={chainId}
          note="Sale inventory plus unclaimed referral tokens"
        />
        <BalanceCard
          label="USDT in contract"
          token={usdt}
          presale={presale}
          decimals={Number(sale?.usdtDecimals || 18)}
          chainId={chainId}
          note="Proceeds from USDT buys. Not paid out on referral claims."
        />
      </div>

      <dl className="admin-panel grid gap-3 p-4 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-400">Reserved for claims</dt>
          <dd className="mt-1 font-display text-xl">{unclaimed !== undefined ? formatBalance(unclaimed, 18) : "—"} $MYTREE</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-400">Contract owner</dt>
          <dd className="mt-1 break-all font-mono text-xs">{owner || "Not published"}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-400">Connected wallet</dt>
          <dd className="mt-1 text-sm">{address ? shortAddress(address) : "Not connected"} {ownerMatch ? "· owner" : address ? "· not owner" : ""}</dd>
          {chain?.id && chain.id !== chainId && <p className="mt-1 text-xs text-sand">Switch to chain {chainId} to move funds.</p>}
        </div>
      </dl>

      {!enabled && <p className="admin-panel p-4 text-sm text-sand">Set the presale contract address in Sale. Balances stay hidden until that address is published.</p>}

      <AssetPanel title="Move $MYTREE" token={token} decimals={18} presale={enabled ? presale : ""} fallbackTo={address} chainId={chainId} />
      <AssetPanel title="Move USDT" token={usdt} decimals={Number(sale?.usdtDecimals || 18)} presale={enabled ? presale : ""} fallbackTo={address} chainId={chainId} />
      <OwnershipPanel presale={enabled ? presale : ""} chainId={chainId} />
    </div>
  );
}

function BalanceCard({ label, token, presale, decimals, chainId, note }) {
  const ready = Boolean(token && presale && isAddress(token) && isAddress(presale));
  const { data, isLoading, isError } = useReadContract({
    address: ready ? token : undefined,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: ready ? [presale] : undefined,
    chainId,
    query: { enabled: ready },
  });
  return (
    <section className="admin-panel p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-2 font-display text-4xl text-mint">
        {isLoading ? "…" : isError ? "Unreadable" : data !== undefined ? formatBalance(data, decimals) : "—"}
      </p>
      <p className="mt-2 text-sm text-slate-400">{note}</p>
      <p className="mt-3 break-all font-mono text-xs text-slate-500">{ready ? token : "Token address not set"}</p>
    </section>
  );
}

function formatBalance(value, decimals) {
  const raw = formatUnits(value, decimals);
  const n = Number(raw);
  if (!Number.isFinite(n)) return raw;
  return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function AssetPanel({ title, token, decimals, presale, fallbackTo, chainId }) {
  const [amount, setAmount] = useState("");
  const [to, setTo] = useState("");
  const [message, setMessage] = useState("");
  const { writeContractAsync, isPending } = useWriteContract();
  const ready = Boolean(token && presale && isAddress(token) && isAddress(presale));

  function units() {
    return parseUnits(amount || "0", decimals);
  }

  async function run(label, send) {
    setMessage("");
    try {
      const hash = await send();
      setMessage(`${label} submitted: ${hash}`);
    } catch (err) {
      setMessage(err.shortMessage || err.message || `${label} failed.`);
    }
  }

  return (
    <section className="admin-panel space-y-3 p-5">
      <h2 className="font-display text-xl">{title}</h2>
      {!ready && <p className="text-sm text-sand">Add this token address in Sale settings.</p>}
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block text-xs text-slate-400">
          Amount
          <input className={`${input} mt-1`} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
        </label>
        <label className="block text-xs text-slate-400">
          Withdraw to
          <input className={`${input} mt-1`} value={to} onChange={(e) => setTo(e.target.value)} placeholder={fallbackTo || "0x…"} />
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={!ready || isPending} onClick={() => run("Approve", () => writeContractAsync({ address: token, abi: erc20Abi, functionName: "approve", args: [presale, units()], chainId }))} className="min-h-11 rounded-md border border-white/15 px-4 text-sm disabled:opacity-50">Approve</button>
        <button type="button" disabled={!ready || isPending} onClick={() => run("Deposit", () => writeContractAsync({ address: presale, abi: presaleAbi, functionName: "depositToken", args: [token, units()], chainId }))} className="min-h-11 rounded-md bg-leaf px-4 text-sm font-semibold text-ink disabled:opacity-50">Deposit</button>
        <button type="button" disabled={!ready || isPending} onClick={() => run("Withdraw", () => writeContractAsync({ address: presale, abi: presaleAbi, functionName: "withdrawToken", args: [token, to || fallbackTo, units()], chainId }))} className="min-h-11 rounded-md border border-white/15 px-4 text-sm disabled:opacity-50">Withdraw</button>
      </div>
      {message && <p className="break-all text-sm text-slate-300" role="status">{message}</p>}
      <Toast message={message} />
    </section>
  );
}

function OwnershipPanel({ presale, chainId }) {
  const [nextOwner, setNextOwner] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [message, setMessage] = useState("");
  const { writeContractAsync, isPending } = useWriteContract();

  async function transfer() {
    setMessage("");
    if (!presale || !isAddress(nextOwner) || !confirmed) {
      setMessage("Enter a valid address and confirm the transfer.");
      return;
    }
    try {
      const hash = await writeContractAsync({
        address: presale,
        abi: presaleAbi,
        functionName: "transferOwnership",
        args: [nextOwner],
        chainId,
      });
      setMessage(`Ownership transfer submitted: ${hash}`);
    } catch (err) {
      setMessage(err.shortMessage || err.message || "Transfer failed.");
    }
  }

  return (
    <section className="admin-panel space-y-3 border-clay/40 p-5">
      <h2 className="font-display text-xl">Ownership</h2>
      <p className="text-sm text-slate-400">The new owner can deposit, withdraw, change price, and transfer ownership again. This wallet loses those rights after the transaction confirms.</p>
      <input className={input} value={nextOwner} onChange={(e) => setNextOwner(e.target.value)} placeholder="New owner wallet" />
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
        I understand this transfers contract control
      </label>
      <button type="button" disabled={isPending || !confirmed} onClick={transfer} className="min-h-11 rounded-md bg-clay px-4 text-sm font-semibold text-ink disabled:opacity-50">Transfer ownership</button>
      {message && <p className="break-all text-sm text-slate-300" role="status">{message}</p>}
      <Toast message={message} />
    </section>
  );
}
