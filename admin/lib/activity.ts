// Shared with the Nexa site: it appends, we read. JSONL keeps appends atomic
// per line so a half-written tail line can never corrupt history.

import { readFile, stat } from "node:fs/promises";
import path from "node:path";

export type ActivityRow = {
  /** unix ms */
  t: number;
  kind: "quote" | "swap" | "approve";
  wallet: string;
  sell: string;
  buy: string;
  amount: string;
  ok: boolean;
};

// The Nexa app is the repo root next to this app; its data dir holds the log.
const LOG_PATH = path.join(process.cwd(), "..", "data", "activity.jsonl");
const MAX_ROWS = 500;

function parseLine(line: string): ActivityRow | null {
  try {
    const o = JSON.parse(line) as Partial<ActivityRow>;
    if (typeof o?.t !== "number" || !Number.isFinite(o.t)) return null;
    if (o.kind !== "quote" && o.kind !== "swap" && o.kind !== "approve") return null;
    return {
      t: o.t,
      kind: o.kind,
      wallet: typeof o.wallet === "string" ? o.wallet.slice(0, 64) : "",
      sell: typeof o.sell === "string" ? o.sell.slice(0, 64) : "",
      buy: typeof o.buy === "string" ? o.buy.slice(0, 64) : "",
      amount: typeof o.amount === "string" ? o.amount.slice(0, 40) : "",
      ok: !!o.ok,
    };
  } catch {
    return null; // torn tail line
  }
}

export async function readActivity(limit = MAX_ROWS): Promise<ActivityRow[]> {
  let raw: string;
  try {
    const info = await stat(LOG_PATH);
    if (info.size > 2_000_000) return [];
    raw = await readFile(LOG_PATH, "utf8");
  } catch {
    return []; // no activity yet
  }
  const rows: ActivityRow[] = [];
  const lines = raw.split("\n");
  for (let i = lines.length - 1; i >= 0 && rows.length < limit; i--) {
    const line = lines[i]!.trim();
    if (!line) continue;
    const row = parseLine(line);
    if (row) rows.push(row);
  }
  return rows;
}
