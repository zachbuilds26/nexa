// Append-only activity log shared with the admin console (admin/lib/activity.ts
// reads it). One JSON object per line; the reader tolerates a torn tail line.

import { appendFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

export type ActivityKind = "quote" | "swap" | "approve";

export type ActivityRow = {
  /** unix ms */
  t: number;
  kind: ActivityKind;
  wallet: string;
  sell: string;
  buy: string;
  amount: string;
  ok: boolean;
};

const LOG_DIR = path.join(process.cwd(), "data");
const LOG_PATH = path.join(LOG_DIR, "activity.jsonl");
// Rotate before the file gets unwieldy - the admin only reads recent rows.
const MAX_BYTES = 512 * 1024;

const ADDRESS = /^0x[0-9a-fA-F]{40}$/;

function bounded(v: unknown, max: number): string {
  return typeof v === "string" ? v.slice(0, max) : "";
}

/** Fire-and-forget: logging must never affect the API response. */
export function logActivity(input: {
  kind: ActivityKind;
  params: URLSearchParams;
  ok: boolean;
}): void {
  void (async () => {
    try {
      const wallet = bounded(input.params.get("userWalletAddress"), 42);
      const sell = bounded(input.params.get("fromTokenAddress"), 42);
      const buy = bounded(input.params.get("toTokenAddress"), 42);
      const row: ActivityRow = {
        t: Date.now(),
        kind: input.kind,
        wallet: ADDRESS.test(wallet) ? wallet : "",
        sell: ADDRESS.test(sell) ? sell : "",
        buy: ADDRESS.test(buy) ? buy : "",
        amount: bounded(input.params.get("amount"), 40),
        ok: input.ok,
      };
      await mkdir(LOG_DIR, { recursive: true });
      // Trim instead of grow: once over the cap, keep the newest half.
      try {
        const info = await stat(LOG_PATH);
        if (info.size > MAX_BYTES) {
          const raw = await readFile(LOG_PATH, "utf8");
          const lines = raw.split("\n").filter(Boolean);
          await writeFile(LOG_PATH, lines.slice(-Math.floor(lines.length / 2)).join("\n") + "\n", "utf8");
        }
      } catch {
        // file does not exist yet - fine
      }
      await appendFile(LOG_PATH, `${JSON.stringify(row)}\n`, "utf8");
    } catch {
      // storage unavailable - activity just won't record
    }
  })();
}
