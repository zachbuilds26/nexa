"use client";

import { useQuery } from "@tanstack/react-query";

export type TickerRow = {
  price: string;
  chgPct: string;
  quoteVolume: string;
};
export type TickerMap = Record<string, TickerRow>;

/**
 * Batched 24h spot tickers for the whole bStock universe, keyed by spot pair
 * (Stock.cs). One request for every volume figure; fetched only while the
 * search palette is open so pages don't pay for it.
 */
export function useUniverseTickers(enabled: boolean) {
  return useQuery({
    queryKey: ["universe-tickers"],
    queryFn: async () => {
      const res = await fetch("/api/rwa/tickers");
      const json = (await res.json().catch(() => null)) as {
        ok?: boolean;
        data?: TickerMap;
      } | null;
      if (!json?.ok) throw new Error("tickers failed");
      return json.data ?? {};
    },
    staleTime: 30_000,
    gcTime: 300_000,
    enabled,
  });
}
