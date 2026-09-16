import { ShieldCheck, ScanEye } from "lucide-react";
import { formatNumber } from "../lib/format";
import { useSiteContent } from "../hooks/useSiteContent";
import { Badge, LoadingBlock, Section } from "./ui";

export default function PogaTable() {
  const { poga, loading } = useSiteContent();
  return (
    <Section
      id="poga"
      eyebrow="Proof of Green Action"
      title="A reward only after the claim survives the check."
      intro="Task, base reward, how it is verified, and the anti-cheat rule. Every row is editable."
    >
      {loading ? <LoadingBlock /> : (
        <div className="overflow-x-auto rounded-card border border-white/10">
          <table className="min-w-[720px] w-full text-left text-sm">
            <thead className="sticky top-0 bg-moss text-caption uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3">Task</th>
                <th className="px-4 py-3 text-right">Base reward</th>
                <th className="px-4 py-3">Verification</th>
                <th className="px-4 py-3">Anti-cheat</th>
              </tr>
            </thead>
            <tbody>
              {(poga || []).map((row) => (
                <tr key={row.id} className="border-t border-white/10 align-top odd:bg-white/[0.03]">
                  <td className="px-4 py-4 text-foam">{row.task}</td>
                  <td className="px-4 py-4 text-right tabular-nums text-mint">{formatNumber(row.baseReward)} $MYTREE</td>
                  <td className="px-4 py-4">
                    <Badge tone="info"><ScanEye size={12} aria-hidden="true" /> {row.verification}</Badge>
                  </td>
                  <td className="px-4 py-4">
                    <Badge><ShieldCheck size={12} aria-hidden="true" /> {row.antiCheat}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  );
}
