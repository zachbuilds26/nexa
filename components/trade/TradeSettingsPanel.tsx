"use client";

import { useRef, useState } from "react";
import { ChevronLeft, Droplets, Zap } from "lucide-react";
import { fmtNumTrim } from "@/lib/format";
import type { TradeSettings } from "@/lib/tradeSettings";

const DEFAULT_SLIPPAGE = 0.5;

function Toggle({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors ${
        on ? "border-accent bg-accent/25" : "border-line-strong bg-fill"
      }`}
    >
      <span
        className={`absolute top-0.5 h-[18px] w-[18px] rounded-full transition-all ${
          on ? "left-[22px] bg-accent" : "left-0.5 bg-dim"
        }`}
      />
    </button>
  );
}

function Radio({ on }: { on: boolean }) {
  return (
    <span
      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
        on ? "border-accent" : "border-line-strong"
      }`}
    >
      {on ? <span className="h-2 w-2 rounded-full bg-accent" /> : null}
    </span>
  );
}

function isDefaultSlip(v: number) {
  return Math.abs(v * 100 - DEFAULT_SLIPPAGE) < 1e-9;
}

/** Inline trade-settings panel rendered in place of the swap form. */
export function TradeSettingsPanel({
  settings,
  onChange,
  autoPct,
  onBack,
}: {
  settings: TradeSettings;
  onChange: (patch: Partial<TradeSettings>) => void;
  /** Live auto-slippage value computed from the current quote's price impact. */
  autoPct: number;
  onBack: () => void;
}) {
  const [txt, setTxt] = useState(() =>
    isDefaultSlip(settings.slippage) ? "" : fmtNumTrim(settings.slippage * 100),
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const auto = settings.autoSlippage;
  const customOn = !auto && !isDefaultSlip(settings.slippage);

  function handleCustom(s: string) {
    setTxt(s);
    if (!/^\d*\.?\d*$/.test(s)) return;
    const n = Number(s);
    if (!Number.isFinite(n) || n < 0.01 || n > 50) return;
    onChange({ slippage: n / 100 });
  }

  function selectCustom() {
    onChange({ autoSlippage: false });
    if (txt === "") {
      setTxt("0.5");
      onChange({ autoSlippage: false, slippage: 0.005 });
    }
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  return (
    <div>
      {/* Header with back */}
      <div className="mb-4 flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to swap"
          className="-ml-1.5 rounded-lg p-1.5 text-dim transition-colors hover:text-accent"
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={1.7} />
        </button>
        <h1 className="text-sm font-semibold text-fg">Trade Settings</h1>
      </div>

      {/* Slippage Settings */}
      <p className="mb-3 flex items-center gap-2 text-sm font-medium text-fg">
        <Droplets className="h-4 w-4 text-accent" strokeWidth={1.7} />
        Slippage Settings
      </p>

      {/* Auto option */}
      <button
        type="button"
        onClick={() => onChange({ autoSlippage: true })}
        className={`flex w-full cursor-pointer items-center gap-3 rounded-xl border px-4 py-4 text-left transition-colors ${
          auto ? "border-accent bg-accent/5" : "border-line-strong hover:border-line"
        }`}
      >
        <Radio on={auto} />
        <span className="text-sm font-medium text-fg">Auto</span>
        <span className="tnum ml-auto text-sm font-medium text-dim">
          {fmtNumTrim(autoPct)}%
        </span>
      </button>

      {/* Custom option */}
      <label
        className={`mt-2.5 flex w-full cursor-pointer items-center gap-3 rounded-xl border px-4 py-4 transition-colors ${
          customOn ? "border-accent bg-accent/5" : "border-line-strong hover:border-line"
        }`}
      >
        <Radio on={customOn} />
        <span className="text-sm font-medium text-fg">Custom</span>
        <span className="ml-auto flex items-center gap-1">
          <input
            ref={inputRef}
            value={txt}
            onChange={(e) => handleCustom(e.target.value)}
            onFocus={selectCustom}
            inputMode="decimal"
            placeholder="-"
            aria-label="Custom slippage percentage"
            className="tnum w-12 bg-transparent text-right text-sm font-medium text-fg outline-none placeholder:text-dim"
          />
          <span className="text-sm text-dim">%</span>
        </span>
      </label>

      <div className="my-6 border-t border-line" />

      {/* Expert mode */}
      <div className="flex items-center gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-medium text-fg">
            <Zap className="h-4 w-4 text-accent" strokeWidth={1.7} />
            Expert mode
          </p>
          <p className="mt-0.5 text-xs text-dim">
            Swap in one tap. High price impact shows inline instead of warning.
          </p>
        </div>
        <span className="ml-auto">
          <Toggle
            on={settings.expert}
            onChange={(v) => onChange({ expert: v })}
            label="Expert mode"
          />
        </span>
      </div>
    </div>
  );
}
