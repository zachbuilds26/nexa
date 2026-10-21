export function fmtUsd(v: number | null | undefined, dp = 2): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "-";
  return `$${v.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp })}`;
}

/** Compact USD for stat cards: $1.2T / $606.8M / $500 */
export function fmtUsdCompact(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "-";
  const abs = Math.abs(v);
  if (abs >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
  return fmtUsd(v, 0);
}

export function fmtSignedPct(v: number | null | undefined, dp = 2): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "-";
  const s = v > 0 ? "+" : "";
  return `${s}${v.toFixed(dp)}%`;
}

/** Trailing-zero trim for percent labels: 0.10 -> 0.1, 1.00 -> 1, 50.00 -> 50. */
export function fmtNumTrim(v: number, dp = 2): string {
  const s = v.toFixed(dp);
  return s.includes(".") ? s.replace(/0+$/, "").replace(/\.$/, "") : s;
}

export function parseAmountToUnits(input: string, decimals: number): bigint {
  const trimmed = input.trim();
  if (!trimmed || !/^\d*\.?\d*$/.test(trimmed)) return 0n;
  const [whole, frac = ""] = trimmed.split(".");
  const fracPadded = (frac + "0".repeat(decimals)).slice(0, decimals);
  return BigInt(whole || "0") * 10n ** BigInt(decimals) + BigInt(fracPadded || "0");
}

export function formatUnits(units: bigint, decimals: number, maxDp = 6): string {
  const neg = units < 0n;
  const abs = neg ? -units : units;
  const base = 10n ** BigInt(decimals);
  const whole = abs / base;
  const frac = abs % base;
  let fracStr = frac.toString().padStart(decimals, "0").slice(0, maxDp);
  fracStr = fracStr.replace(/0+$/, "");
  const wholeStr = whole.toLocaleString("en-US");
  const out = fracStr ? `${wholeStr}.${fracStr}` : wholeStr;
  return neg ? `-${out}` : out;
}

/**
 * bigint units -> JS number for USD math. NEVER do Number(formatUnits(...)):
 * formatUnits is locale-formatted ("1,500.5") and Number("1,500.5") is NaN.
 */
export function unitsToNumber(units: bigint, decimals: number): number {
  return Number(units) / 10 ** decimals;
}

export function minReceived(amount: bigint, slippage: number): bigint {
  const bps = BigInt(Math.round(slippage * 10_000));
  return (amount * (10_000n - bps)) / 10_000n;
}
