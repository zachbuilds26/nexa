"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { TokenList } from "@/components/trade/TokenList";
import { DotsBackdrop } from "@/components/ui/DotsBackdrop";
import { useUniverse } from "@/hooks/useRwa";
import type { Stock } from "@/lib/rwa";

export default function StocksPage() {
  const router = useRouter();
  const universe = useUniverse();
  // Stable identity so the memoized TokenRow children skip re-rendering on
  // parent state changes (search keystrokes re-render the list shell only).
  const handleSelect = useCallback(
    (s: Stock) => router.push(`/stocks/${s.contractAddress}`),
    [router],
  );

  return (
    <div className="relative">
      <DotsBackdrop />
      <div className="relative mx-auto max-w-[1200px] px-4 py-6 lg:px-8">
      <div className="mb-5">
        <h1 className="text-2xl font-semibold text-fg">Stocks</h1>
        <p className="mt-1 max-w-2xl text-sm text-dim">
          Tokenized US stocks, tradable 24/7.
        </p>
      </div>

      {universe.isError ? (
        <div className="rounded-xl border border-line bg-surface-3 p-6 text-sm text-down">
          Failed to load the universe.{" "}
          <button
            type="button"
            className="underline"
            onClick={() => void universe.refetch()}
          >
            retry
          </button>
        </div>
      ) : (
        <TokenList
          loading={universe.isLoading || !universe.data}
          tokens={universe.data}
          onSelect={handleSelect}
        />
      )}
      </div>
    </div>
  );
}
