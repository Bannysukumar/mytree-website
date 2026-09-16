export default function TestimonialCard({ item }) {
  return (
    <figure className="glass h-full overflow-hidden p-0">
      {item.imageUrl && <img src={item.imageUrl} alt="" loading="lazy" className="h-40 w-full object-cover" />}
      <div className="p-6">
      <blockquote className="font-display text-2xl leading-snug text-foam">“{item.quote}”</blockquote>
      <figcaption className="mt-6 text-sm text-white/60">
        <span className="text-mint">{item.name}</span>
        <span className="block">{item.place}</span>
      </figcaption>
      </div>
    </figure>
  );
}
