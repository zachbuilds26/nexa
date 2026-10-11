"use client";

import { TriangleAlert } from "lucide-react";
import { useConnection, useSwitchChain } from "wagmi";

const BSC_ID = 56;

export function WrongNetworkBanner() {
  const { isConnected, chainId } = useConnection();
  const { mutate: switchChain, isPending, error } = useSwitchChain();

  if (!isConnected || chainId === undefined || chainId === BSC_ID) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 border-b border-line bg-surface-3 px-4 py-3 text-sm">
      <TriangleAlert className="h-4 w-4 shrink-0 text-accent" strokeWidth={1.7} />
      <span className="text-fg">
        Wrong network. Nexa runs on BNB Smart Chain.
      </span>
      <button
        type="button"
        disabled={isPending}
        onClick={() => switchChain({ chainId: BSC_ID })}
        className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-ink scanlines transition-colors hover:bg-accent-hover disabled:opacity-60"
      >
        {isPending ? "Switching…" : "Switch to BSC"}
      </button>
      {error ? (
        <span className="max-w-[240px] text-xs text-down">
          {error.message.split("\n")[0]}
        </span>
      ) : null}
    </div>
  );
}
