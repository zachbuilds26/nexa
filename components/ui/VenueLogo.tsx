import type { Venue } from "@/lib/earnKey";
import { venueName } from "@/lib/earnKey";

const SRC: Record<Venue, string> = {
  venus: "/venues/venus.webp",
  native: "/venues/native.png",
};

/** Official venue mark (Venus / Native) as a round chip, matching TokenImage. */
export function VenueLogo({
  venue,
  size = 24,
  className = "",
}: {
  venue: Venue;
  size?: number;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- local static logo in /public
    <img
      src={SRC[venue]}
      alt={`${venueName(venue)} logo`}
      width={size}
      height={size}
      loading="lazy"
      className={`shrink-0 rounded-full object-contain ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
