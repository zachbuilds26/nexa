"use client";

import { useEffect, useState } from "react";

function fmtAgo(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.round(m / 60)}h ago`;
}

/**
 * "Updated 12s ago" - a live data-freshness label. Pass the React Query
 * `dataUpdatedAt` (ms epoch) of the feed it describes; renders nothing
 * until the feed has landed at least once.
 */
export function Freshness({
  at,
  prefix = "Updated",
  className = "",
}: {
  at?: number | null;
  prefix?: string;
  className?: string;
}) {
  // Date.now() is impure, so it only runs inside the interval callback,
  // never during render or synchronously in the effect body.
  const [now, setNow] = useState(0);

  useEffect(() => {
    if (!at) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [at]);

  if (!at || !now) return null;

  return (
    <span className={`tnum ${className}`}>
      {prefix} {fmtAgo(now - at)}
    </span>
  );
}
