"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { fetchBnQuote } from "@/lib/binanceTrade";
import { READ_WALLET } from "@/lib/constants";

const SLIPPAGE = 0.005;
const QUOTE_TTL_S = 30;

export type UiQuote = {
  quoteId: string;
  executionMode: string;
  vendorName: string;
  toTokenAmount: string;
  priceImpactBps: number | null;
  tradeFee: string;
  approveTarget?: string;
  expiresAt: number;
};

function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(i);
  }, [intervalMs]);
  return now;
}

export function useQuote(params: {
  tokenIn?: `0x${string}`;
  tokenOut?: `0x${string}`;
  amountUnits: bigint;
  slippage?: number;
}) {
  const { tokenIn, tokenOut, amountUnits, slippage } = params;
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
      const row = await fetchBnQuote({
        from: tokenIn!,
        to: tokenOut!,
        amount: amountUnits.toString(),
        wallet: READ_WALLET,
      });
      return {
        quoteId: row.quoteId,
        executionMode: row.executionMode,
        vendorName: row.vendorName,
        toTokenAmount: row.toTokenAmount,
        priceImpactBps:
          row.priceImpactPercent === null || row.priceImpactPercent === undefined
            ? null
            : Math.round(Number(row.priceImpactPercent) * 100),
        tradeFee: row.tradeFee ?? "0",
        approveTarget: row.approveTarget,
        expiresAt: Math.floor(Date.now() / 1000) + QUOTE_TTL_S,
      };
    },
    enabled: ready && debouncedKey === key,
    staleTime: 0,
    gcTime: 30_000,
    refetchInterval: 15_000,
    retry: 1,
  });

  const now = useNow();
  const expired = query.data !== undefined && query.data.expiresAt * 1000 <= now;

  return { ...query, expired, now, slippage: slippage ?? SLIPPAGE };
}

export { SLIPPAGE as QUOTE_SLIPPAGE };
