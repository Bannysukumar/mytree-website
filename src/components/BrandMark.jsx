import { useSiteContent } from "../hooks/useSiteContent";

export default function BrandMark({ className = "h-8 w-8", wordmark = true }) {
  const { brand } = useSiteContent();
  const src = brand?.logoUrl || "/logo.svg";
  const name = brand?.name || "Mytree";
  return (
    <span className="inline-flex items-center gap-3">
      <img src={src} alt={wordmark ? "" : brand?.alt || name} className={`${className} rounded-md object-cover`} />
      {wordmark && <span className="text-sm font-semibold tracking-tight">{name}</span>}
    </span>
  );
}
