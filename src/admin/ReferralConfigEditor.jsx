import { useState } from "react";
import { useWriteContract } from "wagmi";
import { presaleAbi } from "../lib/contractConfig";
import { saveDoc } from "../lib/adminApi";
import { useSiteContent } from "../hooks/useSiteContent";
import { SaveBar, Toast } from "./ui";

const input = "w-full rounded-xl border border-white/10 bg-ink px-3 py-2 text-sm";

export default function ReferralConfigEditor({ user }) {
  const { referral, sale } = useSiteContent();
  const [draft, setDraft] = useState(null);
  const [message, setMessage] = useState("");
  const { writeContractAsync } = useWriteContract();
  const current = draft || referral || {};
  const levels = current.additionalLevels || [];

  function set(patch) {
    setDraft({ ...current, ...patch });
  }

  async function save() {
    const payload = {
      referrerBonusPercentage: Number(current.referrerBonusPercentage),
      buyerBonusPercentage: Number(current.buyerBonusPercentage),
      additionalLevels: levels.map((level, index) => ({
        level: Number(level.level || index + 2),
        percentage: Number(level.percentage),
      })),
      maxDepth: Number(current.maxDepth || 1),
      rewardsPoolCap: Number(current.rewardsPoolCap || 0),
      enabled: current.enabled !== false,
    };
    await saveDoc(user, "config", "referral", payload, "update:referral");
    setMessage("Referral percentages saved. Public copy using {{referrerPct}} will match these numbers.");
    setDraft(payload);
  }

  async function syncChain() {
    if (!sale?.contractAddress) {
      setMessage("Publish the presale address in Sale settings first.");
      return;
    }
    const referrerBps = Math.round(Number(current.referrerBonusPercentage) * 100);
    const buyerBps = Math.round(Number(current.buyerBonusPercentage) * 100);
    await writeContractAsync({
      address: sale.contractAddress,
      abi: presaleAbi,
      functionName: "setReferralBonuses",
      args: [BigInt(referrerBps), BigInt(buyerBps)],
    });
    const bps = levels.map((level) => Number(level.percentage) * 100);
    await writeContractAsync({
      address: sale.contractAddress,
      abi: presaleAbi,
      functionName: "setUpstreamLevels",
      args: [bps, Number(current.maxDepth || 1)],
    });
    setMessage("On-chain bonuses submitted from the connected owner wallet.");
  }

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="font-display text-3xl">Referral program</h1>
      <p className="text-sm text-white/60">Referral income is paid once, on a buyer’s first purchase, and only to a sponsor who has already bought. If A referred B and B refers C, C’s first buy can pay B {current.referrerBonusPercentage || 0}% and A {levels[0]?.percentage || 0}%. If B has not bought, B’s share is skipped and A still receives the upstream share if A has bought. Later buys by the same wallet pay no further referral income. A claim sends $MYTREE, never USDT.</p>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-xs text-white/50">Direct referrer (B) %
          <input className={`${input} mt-1`} type="number" value={current.referrerBonusPercentage ?? ""} onChange={(e) => set({ referrerBonusPercentage: e.target.value })} />
        </label>
        <label className="text-xs text-white/50">Buyer extra % (usually 0)
          <input className={`${input} mt-1`} type="number" value={current.buyerBonusPercentage ?? ""} onChange={(e) => set({ buyerBonusPercentage: e.target.value })} />
        </label>
        <label className="text-xs text-white/50">Max depth
          <input className={`${input} mt-1`} type="number" min="1" max="5" value={current.maxDepth ?? 1} onChange={(e) => set({ maxDepth: e.target.value })} />
        </label>
        <label className="text-xs text-white/50">Rewards pool cap (tokens)
          <input className={`${input} mt-1`} type="number" value={current.rewardsPoolCap ?? ""} onChange={(e) => set({ rewardsPoolCap: e.target.value })} />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={current.enabled !== false} onChange={(e) => set({ enabled: e.target.checked })} />
        Program enabled in the public copy
      </label>
      <div>
        <p className="text-sm text-white/70">Upstream levels. Level 2 is A, the person who referred B. Default is 5%.</p>
        {levels.map((level, index) => (
          <div key={index} className="mt-2 flex gap-2">
            <input className={input} type="number" placeholder="Level" value={level.level} onChange={(e) => {
              const next = [...levels];
              next[index] = { ...level, level: e.target.value };
              set({ additionalLevels: next });
            }} />
            <input className={input} type="number" placeholder="Percent" value={level.percentage} onChange={(e) => {
              const next = [...levels];
              next[index] = { ...level, percentage: e.target.value };
              set({ additionalLevels: next });
            }} />
            <button type="button" className="text-sm text-clay" onClick={() => set({ additionalLevels: levels.filter((_, i) => i !== index) })}>Remove</button>
          </div>
        ))}
        <button type="button" className="mt-2 text-sm text-mint" onClick={() => set({ additionalLevels: [...levels, { level: levels.length + 2, percentage: 1 }] })}>Add level</button>
      </div>
      <SaveBar dirty={Boolean(draft)} onSave={save} onCancel={() => { setDraft(null); setMessage(""); }} />
      <button type="button" onClick={syncChain} className="min-h-11 rounded-control border border-white/15 px-4 text-sm">Sync to contract</button>
      {message && <p className="text-sm text-mint" role="status">{message}</p>}
      <Toast message={message} />
    </div>
  );
}
