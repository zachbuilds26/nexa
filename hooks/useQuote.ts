"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { fetchBnQuote } from "@/lib/binanceTrade";
import { READ_WALLET } from "@/lib/constants";

const QUOTE_TTL_S = 30;

type UiQuote = {
  quoteId: string;
  vendorName: string;
  toTokenAmount: string;
  priceImpactBps: number | null;
  tradeFee: string;
  approveTarget?: string;
  expiresAt: number;
};

function useNow(intervalMs = 1000, active = true): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    // Only tick while a quote is live - otherwise an idle SwapCard would
    // re-render every second for nothing (expiry/countdown need 1s precision,
    // the idle card does not).
    if (!active) return;
    // Resync on the next tick - `now` may be stale from the idle period.
    const resync = setTimeout(() => setNow(Date.now()), 0);
    const i = setInterval(() => setNow(Date.now()), intervalMs);
    return () => {
      clearTimeout(resync);
      clearInterval(i);
    };
  }, [intervalMs, active]);
  return now;
}

export function useQuote(params: {
  tokenIn?: `0x${string}`;
  tokenOut?: `0x${string}`;
  amountUnits: bigint;
}) {
  const { tokenIn, tokenOut, amountUnits } = params;
  const ready = Boolean(tokenIn && tokenOut && amountUnits > 0n);
  const key = ready ? `${tokenIn}-${tokenOut}-${amountUnits}` : "idle";

  const [debouncedKey, setDebouncedKey] = useState(key);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedKey(key), 500);
    return () => clearTimeout(t);
  }, [key]);

  const query = useQuery({
    queryKey: ["bn-quote", debouncedKey],
    queryFn: async (): Promise<UiQuote> => {
      // Anchor the TTL at request start: computing it after the fetch would
      // overstate the quote's remaining life by the full network latency.
      const startedAt = Date.now();
      const row = await fetchBnQuote({
        from: tokenIn!,
        to: tokenOut!,
        amount: amountUnits.toString(),
        wallet: READ_WALLET,
      });
      return {
        quoteId: row.quoteId,
        vendorName: row.vendorName,
        toTokenAmount: row.toTokenAmount,
        priceImpactBps:
          row.priceImpactPercent === null || row.priceImpactPercent === undefined
            ? null
            : Math.round(Number(row.priceImpactPercent) * 100),
        tradeFee: row.tradeFee ?? "0",
        approveTarget: row.approveTarget,
        expiresAt: Math.floor(startedAt / 1000) + QUOTE_TTL_S,
      };
    },
    enabled: ready && debouncedKey === key,
    // Quotes carry a 30s TTL; a short staleTime still re-fetches well inside
    // the TTL but stops remounts (e.g. swap/chart panel toggles) from
    // immediately re-hitting the Binance quote endpoint for the same key.
    staleTime: 8_000,
    gcTime: 30_000,
    refetchInterval: 15_000,
    retry: 1,
  });

  const now = useNow(1000, query.data !== undefined);
  const expired = query.data !== undefined && query.data.expiresAt * 1000 <= now;

  return { ...query, expired, now };
}

export { QUOTE_TTL_S };
