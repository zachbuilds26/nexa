import { db, ensureSchema } from "@/lib/db";

export type ActivityKind = "quote" | "swap" | "approve";

const ADDRESS = /^0x[0-9a-fA-F]{40}$/;

function bounded(v: unknown, max: number): string {
  return typeof v === "string" ? v.slice(0, max) : "";
}

let lastPrune = 0;

/** Never rejects: logging must not affect the API response. */
export function logActivity(input: {
  kind: ActivityKind;
  params: URLSearchParams;
  ok: boolean;
}): Promise<void> {
  return (async () => {
    try {
      await ensureSchema();
      const sql = db();
      const wallet = bounded(input.params.get("userWalletAddress"), 42);
      const sell = bounded(input.params.get("fromTokenAddress"), 42);
      const buy = bounded(input.params.get("toTokenAddress"), 42);
      const amount = bounded(input.params.get("amount"), 40);

      await sql`
        insert into activity (kind, wallet, sell, buy, amount, ok)
        values (
          ${input.kind},
          ${ADDRESS.test(wallet) ? wallet : ""},
          ${ADDRESS.test(sell) ? sell : ""},
          ${ADDRESS.test(buy) ? buy : ""},
          ${amount},
          ${input.ok}
        )
      `;

      if (Date.now() - lastPrune > 60 * 60 * 1000) {
        lastPrune = Date.now();
        await sql`delete from activity where created_at < now() - interval '90 days'`;
      }
    } catch {
      console.error("activity log failed");
    }
  })();
}
