import { useEffect, useState } from "react";
import { useSiteContent } from "../hooks/useSiteContent";

function parts(endsAt, now) {
  const diff = Date.parse(endsAt) - now;
  if (!Number.isFinite(diff)) return null;
  const left = Math.max(0, diff);
  return {
    done: diff <= 0,
    days: Math.floor(left / 86400000),
    hours: Math.floor((left % 86400000) / 3600000),
    minutes: Math.floor((left % 3600000) / 60000),
    seconds: Math.floor((left % 60000) / 1000),
  };
}

export default function PresaleTimer({ compact = false }) {
  const { sale } = useSiteContent();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (sale?.timerEnabled === false || !sale?.timerEndsAt) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [sale?.timerEnabled, sale?.timerEndsAt]);

  if (!sale?.timerEndsAt || sale.timerEnabled === false) return null;
  const clock = parts(sale.timerEndsAt, now);
  if (!clock) return null;
  const label = clock.done ? sale.timerEndedText || "This round has closed." : sale.timerLabel || "Presale ends in";
  const cells = [
    ["Days", clock.days],
    ["Hours", clock.hours],
    ["Min", clock.minutes],
    ["Sec", clock.seconds],
  ];
  return (
    <section className={compact ? "" : "mx-auto max-w-6xl px-5 pt-10 xl:max-w-7xl"} aria-live="polite">
      <div className={`flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between ${compact ? "rounded-2xl border border-white/15 bg-[#111827] p-4" : "glass p-5"}`}>
        <div>
          <p className="stat-label">Presale</p>
          <p className="mt-1 text-lg font-semibold text-foam">{label}</p>
        </div>
        {!clock.done && (
          <div className="grid grid-cols-4 gap-2">
            {cells.map(([name, value]) => (
              <div key={name} className="min-w-16 rounded-md border border-white/10 bg-ink px-3 py-2 text-center">
                <p className="font-display text-2xl text-mint">{String(value).padStart(2, "0")}</p>
                <p className="text-[11px] uppercase tracking-wide text-slate-400">{name}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
