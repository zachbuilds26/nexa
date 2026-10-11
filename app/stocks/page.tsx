"use client";

import { useRouter } from "next/navigation";
import { TokenList } from "@/components/trade/TokenList";
import { HotTape } from "@/components/stock/HotTape";
import { useUniverse } from "@/hooks/useRwa";

export default function StocksPage() {
  const router = useRouter();
  const universe = useUniverse();

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-6 lg:px-8">
      <div className="mb-5">
        <h1 className="text-2xl font-semibold text-fg">Stocks</h1>
        <p className="mt-1 max-w-2xl text-sm text-dim">
          Tokenized US stocks, tradable 24/7.
        </p>
      </div>

      <HotTape />

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
          onSelect={(s) => router.push(`/stock/${s.contractAddress}`)}
        />
      )}
    </div>
  );
}
