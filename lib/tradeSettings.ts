// Trade settings persisted in localStorage so the desk keeps user prefs.

export type TradeSettings = {
  /** Auto slippage adjusts to the quote's price impact. */
  autoSlippage: boolean;
  /** Manual slippage as a fraction (0.005 = 0.5%). Used when auto is off. */
  slippage: number;
  /** Expert mode skips the two-step confirm on the swap button. */
  expert: boolean;
};

const KEY = "nexa.trade.settings";

export const DEFAULT_SETTINGS: TradeSettings = {
  autoSlippage: true,
  slippage: 0.005,
  expert: false,
};

export function loadTradeSettings(): TradeSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const j = JSON.parse(raw) as Partial<TradeSettings>;
    return {
      autoSlippage:
        typeof j.autoSlippage === "boolean" ? j.autoSlippage : DEFAULT_SETTINGS.autoSlippage,
      slippage:
        typeof j.slippage === "number" && j.slippage > 0 && j.slippage <= 0.5
          ? j.slippage
          : DEFAULT_SETTINGS.slippage,
      expert: typeof j.expert === "boolean" ? j.expert : DEFAULT_SETTINGS.expert,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveTradeSettings(s: TradeSettings) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // storage full or blocked - prefs just won't persist
  }
}

/**
 * Auto slippage from the quote's price impact: impact plus a 0.3% buffer,
 * doubled for thin books, clamped to 0.5%-2%. Falls back to 0.5% with no quote.
 */
export function autoSlippagePct(priceImpactBps: number | null): number {
  if (priceImpactBps === null || !Number.isFinite(priceImpactBps)) return 0.5;
  const impactPct = priceImpactBps / 100;
  const pct = impactPct * 2 + 0.3;
  return Math.min(2, Math.max(0.5, Math.round(pct * 10) / 10));
}
