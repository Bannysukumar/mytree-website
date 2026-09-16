import { useMemo, useState } from "react";
import { formatInr, formatNumber, formatUsd } from "../lib/format";
import { useSiteContent } from "../hooks/useSiteContent";
import { useTokenPrice } from "../hooks/useTokenPrice";
import { CountUp, Section } from "./ui";

export default function Simulator() {
  const { simulatorTasks, loading } = useSiteContent();
  const { priceUsd, priceInr } = useTokenPrice();
  const [taskId, setTaskId] = useState("");
  const [qty, setQty] = useState(1);
  const tasks = simulatorTasks || [];
  const selected = tasks.find((t) => t.id === (taskId || tasks[0]?.id)) || tasks[0];

  const result = useMemo(() => {
    if (!selected) return { payout: 0, inr: 0, usd: 0 };
    const payout = Number(selected.reward || 0) * Number(qty || 0);
    return { payout, inr: payout * Number(priceInr || 0), usd: payout * Number(priceUsd || 0) };
  }, [selected, qty, priceInr, priceUsd]);

  return (
    <Section
      id="simulator"
      eyebrow="Token simulator"
      title="See the payout before you do the work."
      intro="Pick a task and a quantity. The figures are estimates, not a buy price. Tokens are bought only with USDT. INR does not buy tokens. Nothing is paid from this widget."
    >
      {loading || !selected ? null : (
        <div className="glass grid gap-8 rounded-card p-6 md:grid-cols-2 md:p-8">
          <div>
            <label className="text-caption uppercase text-slate-400" htmlFor="task">Task</label>
            <select id="task" value={selected.id} onChange={(e) => setTaskId(e.target.value)} className="mt-2 min-h-11 w-full rounded-control border border-white/10 bg-ink px-4 py-3">
              {tasks.map((task) => (
                <option key={task.id} value={task.id}>{task.label}</option>
              ))}
            </select>
            <label className="mt-6 flex items-center justify-between text-caption uppercase text-slate-400" htmlFor="qty">
              <span>Quantity ({selected.unit})</span>
              <span className="tabular-nums text-foam">{qty}</span>
            </label>
            <input id="qty" type="range" min="1" max="100" value={qty} onChange={(e) => setQty(e.target.value)} className="mt-3 w-full accent-leaf" />
          </div>
          <div className="rounded-card bg-leaf/10 p-6">
            <p className="text-sm text-slate-300">$MYTREE payout</p>
            <p className="font-display text-5xl tabular-nums text-mint"><CountUp value={result.payout} format={(n) => formatNumber(n, 2)} /></p>
            <p className="mt-4 text-slate-200">{formatInr(result.inr)} · {formatUsd(result.usd)} at the current price</p>
            <p className="mt-2 text-xs text-slate-400">Estimate only. Nothing is paid from this widget.</p>
          </div>
        </div>
      )}
    </Section>
  );
}
