"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { TokenImage } from "@/components/ui/TokenImage";
import { WBNB_BSC } from "@/lib/erc20";

/**
 * Network chip for the header. BSC is the only network in this build, so the
 * menu lists a single active entry (tap it to dismiss). On mobile the chip
 * collapses to the logo + chevron; the opened menu renders identically on all sizes.
 */
export function NetworkSwitch() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Network: BNB Smart Chain"
        className="flex h-9 items-center gap-2 rounded-lg border border-line bg-surface-3 px-2.5 text-xs font-semibold uppercase tracking-wider text-fg transition-colors hover:bg-surface-hover sm:px-3"
      >
        <TokenImage address={WBNB_BSC} symbol="BNB" size={16} />
        <span className="hidden sm:inline">BNB Chain</span>
        <ChevronDown className="h-3.5 w-3.5 text-dim" strokeWidth={1.7} />
      </button>
      {open ? (
        <>
          <button
            type="button"
            aria-label="Close network menu"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div
            role="menu"
            aria-label="Networks"
            className="absolute right-0 z-50 mt-2 w-44 rounded-xl border border-line bg-surface-1/95 p-1.5 shadow-2xl shadow-black/40 backdrop-blur-md"
          >
            <button
              type="button"
              role="menuitemradio"
              aria-checked="true"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2 rounded-lg bg-btn-grey px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-fg transition-colors hover:bg-surface-hover"
            >
              <TokenImage address={WBNB_BSC} symbol="BNB" size={16} />
              BNB Chain
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
