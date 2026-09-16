import { Bike, Droplets, Trees } from "lucide-react";

const accents = {
  mint: "text-mint",
  foam: "text-foam",
  sand: "text-sand",
};

const icons = {
  plantation: Trees,
  water: Droplets,
  mobility: Bike,
};

export default function TrackCard({ track }) {
  const Icon = icons[track.id];
  return (
    <article className="glass flex h-full flex-col overflow-hidden p-0 transition duration-200 hover:-translate-y-0.5 hover:border-mint/40">
      {track.imageUrl && <img src={track.imageUrl} alt="" loading="lazy" className="h-44 w-full object-cover" />}
      <div className="flex flex-1 flex-col p-5">
        {Icon && (
          <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-control bg-mint/10 text-mint" aria-hidden="true">
            <Icon size={20} />
          </span>
        )}
        <p className={`text-caption uppercase ${accents[track.accent] || "text-mint"}`}>{track.tag}</p>
        <h3 className="mt-2 font-display text-2xl text-foam">{track.title}</h3>
        <p className="mt-3 text-white/75">{track.summary}</p>
        <p className="mt-4 flex-1 text-sm leading-relaxed text-white/60">{track.details}</p>
        <p className="mt-6 border-t border-white/10 pt-4 text-sm text-mint">{track.metric}</p>
      </div>
    </article>
  );
}
