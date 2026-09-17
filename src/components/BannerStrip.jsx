import { useEffect, useState } from "react";
import { useSiteContent } from "../hooks/useSiteContent";

export default function BannerStrip() {
  const { banners, brand, loading } = useSiteContent();
  const rows = (banners || []).filter((item) => item.enabled !== false && (item.imageUrl || item.title));
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (rows.length < 2 || paused) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const timer = setInterval(() => setIndex((i) => (i + 1) % rows.length), 7000);
    return () => clearInterval(timer);
  }, [rows.length, paused]);

  if (loading || rows.length === 0) return null;
  const active = Math.min(index, rows.length - 1);

  return (
    <section id="home" className="mesh relative min-h-[72vh] overflow-hidden border-b border-white/10" aria-roledescription="carousel" aria-label="Home banners" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      {rows.map((item, i) => (
        <div key={item.id || i} className={`absolute inset-0 transition-opacity duration-700 ${i === active ? "opacity-100" : "pointer-events-none opacity-0"}`} aria-hidden={i !== active}>
          {item.imageUrl && <img src={item.imageUrl} alt="" className="h-full w-full object-cover" onError={(event) => { event.currentTarget.remove(); }} />}
          <div className="hero-scrim absolute inset-0" />
        </div>
      ))}
      <div className="page relative flex min-h-[72vh] flex-col justify-end pb-12 pt-24">
        {rows.map((item, i) => (
          <div key={item.id || i} className={`max-w-3xl ${i === active ? "block" : "hidden"}`}>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mint">{item.kicker || brand?.name || "Mytree"}</p>
            <h2 className="mt-3 font-display text-display text-foam">{item.title}</h2>
            {(item.body || item.subtitle) && (
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-200">{item.body || item.subtitle}</p>
            )}
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#buy" className="inline-flex min-h-11 items-center rounded-control bg-leaf px-5 text-sm font-semibold text-ink">Buy $MYTREE</a>
              <a href={item.href || "#tracks"} className="inline-flex min-h-11 items-center rounded-control border border-white/30 bg-black/25 px-5 text-sm font-semibold text-white hover:bg-white/10">
                {item.href ? (item.ctaLabel || "See this work") : "Explore Tracks"}
              </a>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
