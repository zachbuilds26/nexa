"use client";

import { InfoTip } from "@/components/ui/InfoTip";

/**
 * Health factor meter - plan §4.2 "Health meter": bar green → amber → red, label "HF 1.85".
 * HF math lives in lib/venus.ts (healthFactorFrom) - this component only renders it.
 *   HF ≥ 1.50 → green, 1.30–1.50 → amber, < 1.30 (or underwater) → red.
 */
export function HealthMeter({
  hf,
  className = "",
}: {
  hf: number | null;
  className?: string;
}) {
  const danger = hf !== null && hf < 1.3;
  const warn = hf !== null && hf < 1.5;
  const fill = danger ? "var(--color-down)" : warn ? "var(--color-warn)" : "var(--color-up)";
  const pct = hf === null ? 0 : Math.max(0, Math.min(1, (hf - 1) / 1.5));
  const width = hf === null ? 0 : danger ? Math.max(pct, 0.06) : pct;

  return (
    <div className={className}>
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="flex items-center gap-1 text-dim">
          Health factor
          <InfoTip text="Collateral against your debt. Below 1.00 your position can be liquidated. Above 1.50 is comfortable." />
        </span>
        <span
          className={`tnum font-semibold ${
            danger ? "text-down" : hf === null ? "text-dim" : warn ? "text-warn" : "text-fg"
          }`}
        >
          {hf === null ? "-" : `HF ${hf.toFixed(2)}`}
        </span>
      </div>
      <div
        className={`h-1.5 w-full overflow-hidden rounded-full ${
          hf === null ? "bg-surface-4" : "bg-surface-1"
        }`}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${width * 100}%`, backgroundColor: fill }}
        />
      </div>
    </div>
  );
}
