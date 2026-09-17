import { useEffect, useState } from "react";
import { useReferralCode } from "../hooks/useReferralCode";
import { useSiteContent } from "../hooks/useSiteContent";
import { formatNumber, shortAddress } from "../lib/format";
import BuyWidget from "./BuyWidget";
import PresaleTimer from "./PresaleTimer";
import { CountUp, LoadingBlock } from "./ui";

function statValue(stat, stats) {
  if (stat.liveKey && stats?.[stat.liveKey]) return Number(stats[stat.liveKey]);
  return Number(stat.value || 0);
}

export default function Hero({ plain = false }) {
  const { hero, stats, loading } = useSiteContent();
  const { landingCode, referrerWallet } = useReferralCode();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!hero?.slides?.length || paused) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const timer = setInterval(() => setIndex((i) => (i + 1) % hero.slides.length), 7000);
    return () => clearInterval(timer);
  }, [hero, paused]);

  if (loading || !hero) return <div className="page py-20"><LoadingBlock /></div>;
  const slide = hero.slides[index] || hero.slides[0];

  return (
    <section id="top" className="relative overflow-hidden border-b border-white/10 mesh">
      {!plain && slide.imageUrl && (
        <img src={slide.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" onError={(event) => { event.currentTarget.remove(); }} />
      )}
      {!plain && <div className="hero-scrim absolute inset-0" />}
      <div className="page relative grid items-start gap-8 py-10 lg:grid-cols-[1.2fr_400px]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mint">{slide.kicker || hero.eyebrow}</p>
          <h1 className="mt-4 max-w-3xl font-display text-h1 text-foam md:text-display">{slide.headline}</h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-200">{slide.body}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href={hero.primaryHref || "#buy"} className="inline-flex min-h-11 items-center rounded-md bg-leaf px-5 py-2.5 text-sm font-semibold text-ink hover:opacity-90">
              {hero.primaryCta}
            </a>
            <a href={hero.secondaryHref || "#donate"} className="inline-flex min-h-11 items-center rounded-md border border-white/20 bg-black/20 px-5 py-2.5 text-sm font-medium text-foam hover:bg-white/10">
              {hero.secondaryCta}
            </a>
          </div>
          {(referrerWallet || landingCode) && (
            <p className="mt-4 text-sm text-sand">Referral saved{referrerWallet ? `: ${shortAddress(referrerWallet)}` : ` (${landingCode})`}. It is applied when this browser buys.</p>
          )}
          {!plain && (
          <div className="mt-8 flex flex-wrap items-center gap-2" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
            {hero.slides.map((item, i) => (
              <button key={item.id || i} type="button" aria-label={`Show slide ${i + 1}`} aria-current={i === index} onClick={() => setIndex(i)} className={`h-11 min-w-11 rounded-md px-3 text-sm ${i === index ? "bg-mint font-semibold text-ink" : "bg-black/40 text-slate-200"}`}>
                {i + 1}
              </button>
            ))}
            <button type="button" className="h-11 rounded-md border border-white/20 bg-black/30 px-4 text-sm" onClick={() => setPaused((v) => !v)} aria-pressed={paused}>
              {paused ? "Play" : "Pause"}
            </button>
          </div>
          )}
        </div>
        <div id="buy" className="scroll-mt-28 space-y-3">
          <PresaleTimer compact />
          <BuyWidget embedded />
        </div>
      </div>
      <dl className="relative grid border-t border-white/10 bg-[#071510]/90 sm:grid-cols-2 lg:grid-cols-4">
        {(hero.stats || []).map((stat) => (
          <div key={stat.id} className="border-white/10 px-5 py-5 md:px-8 lg:border-r lg:last:border-r-0">
            <dd className="font-display text-3xl tabular-nums text-mint">{stat.display || <CountUp value={statValue(stat, stats)} format={formatNumber} />}</dd>
            <dt className="mt-1 text-sm text-slate-300">{stat.label}</dt>
          </div>
        ))}
      </dl>
    </section>
  );
}
