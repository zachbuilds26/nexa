/** URL key helpers for the Earn list → pool detail split (/earn/native-usdt). */

export type Venue = "venus" | "native";

export function earnKey(venue: Venue, symbol: string): string {
  return `${venue}-${symbol.toLowerCase()}`;
}

export function parseEarnKey(
  key: string,
): { venue: Venue; asset: string } | null {
  const i = key.indexOf("-");
  if (i <= 0) return null;
  const venue = key.slice(0, i);
  const asset = key.slice(i + 1).toLowerCase();
  if (venue !== "venus" && venue !== "native") return null;
  if (!asset) return null;
  return { venue, asset };
}

export function venueName(v: Venue): string {
  return v === "venus" ? "Venus Core Pool" : "Native Pool";
}
