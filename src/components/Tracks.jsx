import { useSiteContent } from "../hooks/useSiteContent";
import { LoadingBlock, Section } from "./ui";
import TrackCard from "./TrackCard";

export default function Tracks() {
  const { tracks, loading } = useSiteContent();
  return (
    <Section
      id="tracks"
      eyebrow="What a record holds"
      title="A tagged tree is more than a planting photo."
      intro="Location, species, and a later check. The sale does not replace that walk."
    >
      {loading ? <LoadingBlock /> : (
        <div className="grid gap-6 md:grid-cols-3">
          {(tracks || []).map((track) => <TrackCard key={track.id} track={track} />)}
        </div>
      )}
    </Section>
  );
}
