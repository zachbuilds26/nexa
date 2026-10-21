"use client";

import { useState, type CSSProperties } from "react";

/** Small BNB tag for the corner of a token logo (token-picker badge style). */
export function BnbTag({
  size = 13,
  className = "",
  style,
}: {
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- local static badge svg, next/image adds no value
    <img
      src="/brands/bnb-token.svg"
      alt=""
      width={size}
      height={size}
      className={`pointer-events-none rounded-full bg-ink p-[2px] ${className}`}
      style={{ width: size, height: size, ...style }}
    />
  );
}

export function TokenImage({
  address,
  src: srcProp,
  symbol,
  size = 32,
  className = "",
  badge = true,
}: {
  address?: string;
  /** External icon URL (e.g. a protocol CDN). Falls back to /tokens, then initials. */
  src?: string;
  symbol: string;
  size?: number;
  className?: string;
  /** BNB chain tag on the bottom-right corner. Off for the chain's own logo. */
  badge?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const src = srcProp ?? (address ? `/tokens/${address.toLowerCase()}.png` : undefined);
  const badgeSize = size >= 28 ? Math.round(size * 0.42) : Math.round(size * 0.5);
  const badgeOff = -Math.round(size * 0.09);

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center rounded-full ${className}`}
      style={{ width: size, height: size }}
    >
      {!src || failed ? (
        <span
          aria-hidden
          className="inline-flex h-full w-full items-center justify-center rounded-full border border-line bg-surface-3 font-semibold text-dim"
          style={{ fontSize: Math.max(10, Math.round(size * 0.38)) }}
        >
          {symbol.charAt(0).toUpperCase()}
        </span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- local static logo, next/image adds no value for /public pngs of unknown size
        <img
          src={src}
          alt={`${symbol} logo`}
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-full w-full rounded-full bg-surface-3 object-contain"
        />
      )}
      {badge ? (
        <BnbTag
          size={badgeSize}
          className="absolute"
          style={{ right: badgeOff, bottom: badgeOff }}
        />
      ) : null}
    </span>
  );
}
