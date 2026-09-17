export default function TeamCard({ person }) {
  const initials = person.name.split(" ").map((p) => p[0]).slice(0, 2).join("");
  return (
    <article className="glass overflow-hidden p-0">
      {person.imageUrl ? (
        <img src={person.imageUrl} alt="" loading="lazy" className="h-44 w-full object-cover" onError={(event) => { event.currentTarget.remove(); }} />
      ) : (
        <div className="flex h-44 items-center justify-center bg-mint/10 text-2xl font-semibold text-mint" aria-hidden="true">{initials}</div>
      )}
      <div className="p-4">
        <h3 className="font-display text-2xl text-foam">{person.name}</h3>
        <p className="text-sm text-mint">{person.role}</p>
        <p className="mt-3 text-sm leading-relaxed text-white/65">{person.bio}</p>
      </div>
    </article>
  );
}
