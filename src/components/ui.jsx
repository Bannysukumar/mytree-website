import { useEffect, useRef, useState } from "react";

const buttonStyles = {
  primary: "bg-leaf text-ink",
  secondary: "border border-white/20 bg-white/5 text-foam hover:bg-white/10",
  ghost: "text-foam hover:bg-white/5",
  danger: "bg-clay text-ink",
};

export function Button({ as: Tag = "button", variant = "primary", className = "", children, ...props }) {
  const type = Tag === "button" ? props.type || "button" : undefined;
  return (
    <Tag
      {...props}
      type={type}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-control px-4 py-2.5 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mint disabled:cursor-not-allowed disabled:opacity-60 ${buttonStyles[variant] || buttonStyles.primary} ${className}`}
    >
      {children}
    </Tag>
  );
}

export function Badge({ tone = "neutral", children }) {
  const tones = {
    success: "bg-mint/15 text-mint",
    warning: "bg-sand/15 text-sand",
    danger: "bg-clay/15 text-clay",
    info: "bg-info/15 text-info",
    neutral: "bg-white/10 text-slate-200",
  };
  return <span className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${tones[tone] || tones.neutral}`}>{children}</span>;
}

export function Progress({ value = 0, label }) {
  const clamped = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div>
      {label && <div className="mb-2 flex justify-between text-xs text-slate-400"><span>{label}</span><span className="tabular-nums">{Math.round(clamped)}%</span></div>}
      <div className="h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={Math.round(clamped)} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full w-full origin-left bg-leaf transition-transform duration-700 ease-out" style={{ transform: `scaleX(${clamped / 100})` }} />
      </div>
    </div>
  );
}

export function Reveal({ children, className = "" }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(true);
      return undefined;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setShown(true);
        observer.disconnect();
      }
    }, { threshold: 0.12 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return <div ref={ref} className={`${shown ? "reveal" : ""} ${className}`}>{children}</div>;
}

export function Section({ id, eyebrow, title, intro, children }) {
  return (
    <section id={id} className="page scroll-mt-24 py-14 md:py-16">
      {(eyebrow || title || intro) && (
        <Reveal>
          <header className="max-w-3xl">
            {eyebrow && <p className="text-caption font-semibold uppercase text-mint">{eyebrow}</p>}
            {title && <h2 className="mt-2 font-display text-h2 text-foam md:text-h1">{title}</h2>}
            {intro && <p className="mt-3 max-w-2xl text-body text-slate-300">{intro}</p>}
          </header>
        </Reveal>
      )}
      <Reveal className={title || intro ? "mt-8" : ""}>{children}</Reveal>
    </section>
  );
}

export function Skeleton({ className = "" }) {
  return <div className={`skeleton ${className}`} />;
}

export function Disclaimer({ children }) {
  return <p className="mt-4 text-xs leading-relaxed text-slate-400">{children}</p>;
}

export function CountUp({ value, format }) {
  const target = Number(value || 0);
  const [shown, setShown] = useState(target);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(target);
      return undefined;
    }
    const start = performance.now();
    let frame;
    const tick = (now) => {
      const progress = Math.min(1, (now - start) / 900);
      setShown(target * (1 - (1 - progress) ** 3));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);
  return format ? format(shown) : Math.round(shown);
}

export function LoadingBlock() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Skeleton className="h-40" />
      <Skeleton className="h-40" />
      <Skeleton className="h-40" />
    </div>
  );
}
