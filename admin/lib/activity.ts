import { db, ensureSchema } from "@/lib/db";

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

const MAX_ROWS = 500;

export async function readActivity(limit = MAX_ROWS): Promise<ActivityRow[]> {
  await ensureSchema();
  const sql = db();
  const take = Math.min(Math.max(Math.floor(limit), 1), MAX_ROWS);
  const rows = await sql`
    select kind, wallet, sell, buy, amount, ok, created_at
    from activity
    order by created_at desc
    limit ${take}
  `;

  return rows
    .filter((row) => row.kind === "quote" || row.kind === "swap" || row.kind === "approve")
    .map((row) => ({
      t:
        row.created_at instanceof Date
          ? row.created_at.getTime()
          : new Date(String(row.created_at)).getTime(),
      kind: row.kind as ActivityRow["kind"],
      wallet: typeof row.wallet === "string" ? row.wallet.slice(0, 64) : "",
      sell: typeof row.sell === "string" ? row.sell.slice(0, 64) : "",
      buy: typeof row.buy === "string" ? row.buy.slice(0, 64) : "",
      amount: typeof row.amount === "string" ? row.amount.slice(0, 40) : "",
      ok: !!row.ok,
    }));
}
