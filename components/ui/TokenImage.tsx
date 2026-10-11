"use client";

import { useState } from "react";

export function TokenImage({
  address,
  src: srcProp,
  symbol,
  size = 32,
  className = "",
}: {
  address?: string;
  /** External icon URL (e.g. a protocol CDN). Falls back to /tokens, then initials. */
  src?: string;
  symbol: string;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const src = srcProp ?? (address ? `/tokens/${address.toLowerCase()}.png` : undefined);

  if (!src || failed) {
    return (
      <span
        aria-hidden
        className={`inline-flex shrink-0 items-center justify-center rounded-full border border-line bg-surface-3 font-semibold text-dim ${className}`}
        style={{ width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.38)) }}
      >
        {symbol.charAt(0).toUpperCase()}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- local static logo, next/image adds no value for /public pngs of unknown size
    <img
      src={src}
      alt={`${symbol} logo`}
      width={size}
      height={size}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`shrink-0 rounded-full bg-surface-3 object-contain ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
