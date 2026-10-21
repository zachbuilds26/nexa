"use client";

import type { MarketStatus } from "@/lib/rwa";
import { InfoTip } from "@/components/ui/InfoTip";

export function MarketBadge({
  status,
  error = false,
}: {
  status?: MarketStatus;
  error?: boolean;
}) {
  if (error) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-warn">
        <span className="h-1.5 w-1.5 rounded-full bg-warn" />
        Market status unavailable
      </span>
    );
  }
  if (!status) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-dim">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-dim" />
        Market status…
      </span>
    );
  }
  if (status.openState) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-up">
        <span className="h-1.5 w-1.5 rounded-full bg-up" />
        Market open
        <InfoTip
          align="right"
          text="The underlying US market is open, so swaps for this stock run normally."
        />
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-dim">
      <span className="h-1.5 w-1.5 rounded-full bg-dim" />
      Market closed · on-chain trades 24/7
      <InfoTip
        align="right"
        text="The underlying US market is closed, so the NASDAQ reference price is frozen. This does not block swaps: on-chain trading continues 24/7 at the token's live price."
      />
    </span>
  );
}
