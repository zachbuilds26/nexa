"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchVenusMarkets,
  fetchVenusPosition,
  type VenusMarket,
} from "@/lib/venus";

export function useVenusMarkets() {
  return useQuery({
    queryKey: ["venus-markets"],
    queryFn: fetchVenusMarkets,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}

export function useVenusPosition(
  user: `0x${string}` | undefined,
  markets: VenusMarket[] | undefined,
  marketsUpdatedAt: number,
  fast = false,
) {
  return useQuery({
    queryKey: ["venus-position", user, marketsUpdatedAt],
    queryFn: () => fetchVenusPosition(user as `0x${string}`, markets as VenusMarket[]),
    enabled: Boolean(user && markets),
    staleTime: 10_000,
    refetchInterval: fast ? 2_000 : 30_000,
  });
}
