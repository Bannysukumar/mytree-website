import { useSiteContent } from "../hooks/useSiteContent";
import { LoadingBlock, Section } from "./ui";
import TrackCard from "./TrackCard";

export default function Tracks() {
  const { tracks, loading } = useSiteContent();
  return (
    <Section
      id="tracks"
      eyebrow="Focus areas"
      title="Three jobs. None of them is a slogan."
      intro="Planting, water, and field records. Each track is the work itself, not a slogan."
    >
      {loading ? <LoadingBlock /> : (
        <div className="grid gap-6 md:grid-cols-3">
          {(tracks || []).map((track) => <TrackCard key={track.id} track={track} />)}
        </div>
      )}
    </Section>
  );
}
