import { useState } from "react";
import { formatNumber } from "../lib/format";
import { useSiteContent } from "../hooks/useSiteContent";
import { LoadingBlock, Section } from "./ui";

export default function TokenomicsChart() {
  const { tokenomics, loading } = useSiteContent();
  const [active, setActive] = useState("");
  if (loading || !tokenomics) {
    return (
      <Section id="tokenomics" title="Tokenomics">
        <LoadingBlock />
      </Section>
    );
  }
  const allocations = tokenomics.allocations || [];
  const radius = 82;
  const circ = 2 * Math.PI * radius;
  let offset = 0;
  const current = allocations.find((slice) => slice.id === active);

  return (
    <Section
      id="tokenomics"
      eyebrow="Supply"
      title={`${formatNumber(tokenomics.totalSupply)} ${tokenomics.symbol || "$MYTREE"}`}
      intro={tokenomics.note}
    >
      <div className="grid items-center gap-8 lg:grid-cols-[280px_1fr]">
        <div className="relative mx-auto">
          <svg viewBox="0 0 220 220" className="h-64 w-64" role="img" aria-label="Token allocation chart">
            <circle cx="110" cy="110" r={radius} fill="none" stroke="#243044" strokeWidth="22" />
            {allocations.map((slice) => {
              const len = (Number(slice.percent) / 100) * circ;
              const dash = `${len} ${circ - len}`;
              const node = (
                <circle
                  key={slice.id}
                  className="donut cursor-pointer"
                  cx="110"
                  cy="110"
                  r={radius}
                  fill="none"
                  stroke={slice.color}
                  strokeWidth={active === slice.id ? 28 : 22}
                  strokeDasharray={dash}
                  strokeDashoffset={-offset}
                  opacity={active && active !== slice.id ? 0.35 : 1}
                  onMouseEnter={() => setActive(slice.id)}
                  onMouseLeave={() => setActive("")}
                  onFocus={() => setActive(slice.id)}
                  onBlur={() => setActive("")}
                  tabIndex={0}
                  role="img"
                  aria-label={`${slice.label} ${slice.percent}%`}
                />
              );
              offset += len;
              return node;
            })}
            <text x="110" y="104" textAnchor="middle" fill="#F8FAFC" fontSize="18" fontFamily="Outfit, sans-serif">10B</text>
            <text x="110" y="126" textAnchor="middle" fill="#34D399" fontSize="12" fontFamily="Source Sans 3, sans-serif">fixed</text>
          </svg>
          {current && (
            <p className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-ink/90 px-3 py-1 text-xs text-foam">
              {current.label} · {current.percent}%
            </p>
          )}
        </div>
        <div className="overflow-x-auto rounded-card border border-white/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5 text-caption uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3">Allocation</th>
                <th className="px-4 py-3 text-right">Share</th>
                <th className="px-4 py-3 text-right">Tokens</th>
              </tr>
            </thead>
            <tbody>
              {allocations.map((slice) => (
                <tr
                  key={slice.id}
                  className={`border-t border-white/10 ${active === slice.id ? "bg-mint/10" : ""}`}
                  onMouseEnter={() => setActive(slice.id)}
                  onMouseLeave={() => setActive("")}
                >
                  <td className="px-4 py-3">
                    <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ background: slice.color }} />
                    {slice.label}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-mint">{slice.percent}%</td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-300">{formatNumber((tokenomics.totalSupply * slice.percent) / 100)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Section>
  );
}
