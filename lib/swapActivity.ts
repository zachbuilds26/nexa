// Local swap activity log (localStorage). One record per settled swap.

export type SwapActivity = {
  hash: string;
  fromSymbol: string;
  toSymbol: string;
  fromAmount: string;
  toAmount: string;
  /** Unix ms */
  at: number;
};

const KEY = "nexa.swap.activity";
const MAX = 50;
const TX_HASH = /^0x[0-9a-fA-F]{64}$/;

function asStr(v: unknown): string | null {
  return typeof v === "string" && v.length <= 64 ? v : null;
}

export function loadActivity(): SwapActivity[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const rows = JSON.parse(raw) as SwapActivity[];
    if (!Array.isArray(rows)) return [];
    // localStorage is attacker-writable via XSS or physical access - only keep
    // rows whose tx hash is a real 32-byte hex value (it is interpolated into
    // a bscscan link) and whose display fields are plain bounded strings.
    return rows.filter(
      (r) =>
        r &&
        typeof r.hash === "string" &&
        TX_HASH.test(r.hash) &&
        typeof r.at === "number" &&
        Number.isFinite(r.at) &&
        asStr(r.fromSymbol) !== null &&
        asStr(r.toSymbol) !== null &&
        asStr(r.fromAmount) !== null &&
        asStr(r.toAmount) !== null,
    ) as SwapActivity[];
  } catch {
    return [];
  }
}

export function logSwap(rec: Omit<SwapActivity, "at"> & { at?: number }) {
  if (typeof window === "undefined") return;
  try {
    const rows = loadActivity();
    if (rows.some((r) => r.hash === rec.hash)) return;
    rows.unshift({ ...rec, at: rec.at ?? Date.now() });
    window.localStorage.setItem(KEY, JSON.stringify(rows.slice(0, MAX)));
  } catch {
    // storage blocked - activity just won't persist
  }
}
