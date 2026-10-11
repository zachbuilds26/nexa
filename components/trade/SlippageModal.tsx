"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { fmtNumTrim } from "@/lib/format";

const PRESETS = [0.1, 0.5, 1];

export function SlippageModal({
  value,
  onChange,
  onClose,
}: {
  value: number;
  onChange: (v: number) => void;
  onClose: () => void;
}) {
  const pct = value * 100;
  const isPreset = (p: number) => Math.abs(pct - p) < 1e-9;
  const [txt, setTxt] = useState(() => (isPreset(pct) ? "" : fmtNumTrim(pct)));
  const customActive = txt !== "" && !PRESETS.some((p) => isPreset(p));

  function handleCustom(s: string) {
    setTxt(s);
    if (!/^\d*\.?\d*$/.test(s)) return;
    const n = Number(s);
    if (!Number.isFinite(n) || n < 0.01 || n > 50) return;
    onChange(n / 100);
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
      <button
        type="button"
        aria-label="Close slippage settings"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-line bg-surface-1/95 p-4 shadow-2xl shadow-black/50 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-fg">Slippage tolerance</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-dim transition-colors hover:bg-fill hover:text-accent"
          >
            <X className="h-4 w-4" strokeWidth={1.7} />
          </button>
        </div>

        <div className="mt-4 flex items-center gap-2">
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                setTxt("");
                onChange(p / 100);
              }}
              className={`flex-1 rounded-lg border py-2 text-sm font-semibold transition-colors ${
                isPreset(p)
                  ? "border-line-strong bg-fill-strong text-fg"
                  : "border-line text-dim hover:text-fg"
              }`}
            >
              {p}%
            </button>
          ))}
          <div
            className={`flex flex-1 items-center gap-1 rounded-lg border px-2.5 py-2 ${
              customActive ? "border-line-strong bg-fill-strong" : "border-line"
            }`}
          >
            <input
              value={txt}
              onChange={(e) => handleCustom(e.target.value)}
              inputMode="decimal"
              placeholder="Custom"
              aria-label="Custom slippage percentage"
              className="tnum w-full min-w-0 bg-transparent text-sm text-fg outline-none placeholder:text-dim/60"
            />
            <span className="text-sm text-dim">%</span>
          </div>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-dim">
          Your transaction reverts if the price moves more than this before it confirms.
          Range 0.01–50%.
        </p>
      </div>
    </div>
  );
}
