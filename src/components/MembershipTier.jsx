export default function MembershipTier({ tier, featured }) {
  return (
    <article className={`glass flex h-full flex-col overflow-hidden p-0 ${featured ? "ring-1 ring-mint/60" : ""}`}>
      {tier.imageUrl && <img src={tier.imageUrl} alt="" className="h-36 w-full object-cover" onError={(event) => { event.currentTarget.remove(); }} />}
      <div className="flex flex-1 flex-col p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-sand">{tier.priceLabel}</p>
      <h3 className="mt-2 font-display text-3xl text-foam">{tier.name}</h3>
      <p className="mt-3 text-sm text-white/70">{tier.summary}</p>
      <ul className="mt-4 flex-1 space-y-2 text-sm text-white/80">
        {(tier.benefits || []).map((benefit) => (
          <li key={benefit} className="border-t border-white/10 pt-2">{benefit}</li>
        ))}
      </ul>
      <a href={tier.href || "#contact"} className={`mt-6 inline-flex min-h-11 items-center rounded-control px-4 py-2 text-sm ${featured ? "bg-leaf font-semibold text-ink" : "border border-white/15 text-foam hover:bg-white/5"}`}>{tier.cta}</a>
      </div>
    </article>
  );
}
