import { fillTemplate } from "../lib/format";
import { useSiteContent } from "../hooks/useSiteContent";
import { Disclaimer, Section } from "./ui";
import ReferralDashboard from "./ReferralDashboard";

export default function ReferralExplainer() {
  const { referralCopy, referral, legal, loading } = useSiteContent();
  if (loading || !referralCopy) return null;
  const upstreamPct = referral?.additionalLevels?.[0]?.percentage ?? 0;
  const vars = {
    referrerPct: referral?.referrerBonusPercentage ?? "—",
    buyerPct: referral?.buyerBonusPercentage ?? "—",
    upstreamPct: upstreamPct || "—",
  };
  return (
    <Section id="referral" eyebrow={referralCopy.eyebrow} title="Refer and earn" intro={fillTemplate(referralCopy.headline, vars)}>
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="text-lg leading-relaxed text-white/75">{fillTemplate(referralCopy.body, vars)}</p>
          <ol className="mt-6 space-y-4">
            {(referralCopy.steps || []).map((step, i) => (
              <li key={step.title} className="flex gap-4 rounded-card border border-white/10 bg-moss/80 p-4">
                <span className="font-display text-2xl text-mint">0{i + 1}</span>
                <div>
                  <p className="font-medium text-foam">{step.title}</p>
                  <p className="text-sm text-white/60">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <Disclaimer>{legal?.referral}</Disclaimer>
        </div>
        <ReferralDashboard />
      </div>
    </Section>
  );
}
