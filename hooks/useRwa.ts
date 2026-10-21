"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Dynamic, MarketStatus, Stock, TokenMeta } from "@/lib/rwa";
import type { SpotTicker } from "@/lib/spot";

export function useUniverse() {
  return useQuery({
    queryKey: ["rwa-universe"],
    queryFn: async (): Promise<Stock[]> => {
      const res = await fetch("/api/rwa/universe");
      const json = (await res.json()) as { ok: boolean; data: Stock[] };
      if (!json.ok) throw new Error("universe failed");
      return json.data;
    },
    staleTime: 60 * 60 * 1000,
    // staleTime (1h) outlives the default gcTime (5min) - without a long
    // gcTime the universe cache is dropped while still fresh and every
    // return to a page re-fetches all 90+ tokens.
    gcTime: 24 * 60 * 60 * 1000,
  });
}

export function useDynamic(address: string | undefined) {
  return useQuery({
    queryKey: ["rwa-dynamic", address],
    queryFn: () => fetchDynamic(address as string),
    enabled: Boolean(address),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

/** Shared fetcher - also used with useQueries for a set of held tokens. */
export async function fetchDynamic(address: string): Promise<Dynamic> {
  const res = await fetch(`/api/rwa/dynamic?address=${encodeURIComponent(address)}`);
  const json = (await res.json()) as { ok: boolean; data: Dynamic; error?: string };
  if (!json.ok) throw new Error(json.error ?? "price failed");
  return json.data;
}

/** One query for all bStock prices - batched spot tickers keyed by pair (cs). */
export function useTickers() {
  return useQuery({
    queryKey: ["rwa-tickers"],
    queryFn: async (): Promise<Record<string, SpotTicker>> => {
      const res = await fetch("/api/rwa/tickers");
      const json = (await res.json()) as {
        ok: boolean;
        data: Record<string, SpotTicker>;
      };
      if (!json.ok) throw new Error("tickers failed");
      return json.data;
    },
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

export function useMarketStatus() {
  return useQuery({
    queryKey: ["rwa-status"],
    queryFn: async (): Promise<MarketStatus> => {
      const res = await fetch("/api/rwa/status");
      const json = (await res.json()) as { ok: boolean; data: MarketStatus };
      if (!json.ok) throw new Error("status failed");
      return json.data;
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

type KlineRow = [number, number, number, number, number, number, number];

export function useMeta(address: string | undefined) {
  return useQuery({
    queryKey: ["rwa-meta", address],
    queryFn: async (): Promise<TokenMeta> => {
      const res = await fetch(`/api/rwa/meta?address=${encodeURIComponent(address as string)}`);
      const json = (await res.json()) as { ok: boolean; data: TokenMeta; error?: string };
      if (!json.ok) throw new Error(json.error ?? "meta failed");
      return json.data;
    },
    enabled: Boolean(address),
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  });
}

export function useKline(
  address: string | undefined,
  enabled = true,
  interval = "1h",
  limit = 48,
) {
  return useQuery({
    queryKey: ["rwa-kline", address, interval, limit],
    queryFn: async (): Promise<KlineRow[]> => {
      const res = await fetch(
        `/api/rwa/kline?address=${encodeURIComponent(address as string)}&interval=${encodeURIComponent(interval)}&limit=${encodeURIComponent(String(limit))}`,
      );
      const json = (await res.json()) as { ok: boolean; data: KlineRow[]; error?: string };
      if (!json.ok) throw new Error(json.error ?? "kline failed");
      return json.data;
    },
    enabled: Boolean(address) && enabled,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Market cap for list rows - there is no batch endpoint for fundamentals, so
 * this fills progressively: display order first (the visible 5/10 rows land
 * immediately), one session-wide cache, 3 in flight, and a failed address is
 * never retried this session so a rate limit can't turn into a hammering loop.
 */
const mcapCache = new Map<string, string | null>();
const mcapFailed = new Set<string>();
const mcapInflight = new Set<string>();
const mcapQueue: string[] = [];
const mcapListeners = new Set<() => void>();
let mcapWorkers = 0;

async function pumpMCaps(): Promise<void> {
  const room = 3 - mcapWorkers;
  for (let i = 0; i < room && mcapQueue.length > 0; i += 1) {
    const addr = mcapQueue.shift();
    if (
      !addr ||
      mcapCache.has(addr) ||
      mcapFailed.has(addr) ||
      mcapInflight.has(addr)
    ) {
      continue;
    }
    mcapWorkers += 1;
    mcapInflight.add(addr);
    void (async () => {
      try {
        const d = await fetchDynamic(addr);
        mcapCache.set(addr, d.fundamentals?.marketCap ?? null);
      } catch {
        mcapFailed.add(addr);
      } finally {
        mcapInflight.delete(addr);
        mcapWorkers -= 1;
        mcapListeners.forEach((l) => l());
        void pumpMCaps();
      }
    })();
  }
}

export function useMCaps(addresses: string[]): Record<string, string | null> {
  const [, setTick] = useState(0);

  useEffect(() => {
    const notify = () => setTick((t) => t + 1);
    mcapListeners.add(notify);
    let queued = false;
    for (const a of addresses) {
      if (
        !mcapCache.has(a) &&
        !mcapFailed.has(a) &&
        !mcapInflight.has(a) &&
        !mcapQueue.includes(a)
      ) {
        mcapQueue.push(a);
        queued = true;
      }
    }
    if (queued) void pumpMCaps();
    return () => {
      mcapListeners.delete(notify);
    };
  }, [addresses]);

  const out: Record<string, string | null> = {};
  for (const a of addresses) {
    if (mcapCache.has(a)) out[a] = mcapCache.get(a) ?? null;
  }
  return out;
}

/**
 * 1h change for list rows - two hourly candles per address, filled the same
 * gentle progressive way as market caps (visible rows first, session cache,
 * failures never retried this session).
 */
const h1Cache = new Map<string, number | null>();
const h1Failed = new Set<string>();
const h1Inflight = new Set<string>();
const h1Queue: string[] = [];
const h1Listeners = new Set<() => void>();
let h1Workers = 0;

async function pumpH1(): Promise<void> {
  const room = 4 - h1Workers;
  for (let i = 0; i < room && h1Queue.length > 0; i += 1) {
    const addr = h1Queue.shift();
    if (
      !addr ||
      h1Cache.has(addr) ||
      h1Failed.has(addr) ||
      h1Inflight.has(addr)
    ) {
      continue;
    }
    h1Workers += 1;
    h1Inflight.add(addr);
    void (async () => {
      try {
        const res = await fetch(
          `/api/rwa/kline?address=${encodeURIComponent(addr)}&interval=1h&limit=2`,
        );
        const json = (await res.json()) as {
          ok: boolean;
          data?: [number, number, number, number, number, number, number][];
        };
        const rows = json.ok ? (json.data ?? []) : [];
        if (rows.length < 2) {
          h1Cache.set(addr, null);
        } else {
          const prev = Number(rows[0][4]);
          const now = Number(rows[rows.length - 1][4]);
          const pct =
            Number.isFinite(prev) && Number.isFinite(now) && prev !== 0
              ? ((now - prev) / prev) * 100
              : null;
          h1Cache.set(addr, pct);
        }
      } catch {
        h1Failed.add(addr);
      } finally {
        h1Inflight.delete(addr);
        h1Workers -= 1;
        h1Listeners.forEach((l) => l());
        void pumpH1();
      }
    })();
  }
}

export function useH1Changes(addresses: string[]): Record<string, number | null> {
  const [, setTick] = useState(0);

  useEffect(() => {
    const notify = () => setTick((t) => t + 1);
    h1Listeners.add(notify);
    let queued = false;
    for (const a of addresses) {
      if (
        !h1Cache.has(a) &&
        !h1Failed.has(a) &&
        !h1Inflight.has(a) &&
        !h1Queue.includes(a)
      ) {
        h1Queue.push(a);
        queued = true;
      }
    }
    if (queued) void pumpH1();
    return () => {
      h1Listeners.delete(notify);
    };
  }, [addresses]);

  const out: Record<string, number | null> = {};
  for (const a of addresses) {
    if (h1Cache.has(a)) out[a] = h1Cache.get(a) ?? null;
  }
  return out;
}
