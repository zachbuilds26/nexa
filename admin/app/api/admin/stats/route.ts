import { NextResponse } from "next/server";
import { readActivity, type ActivityRow } from "@/lib/activity";
import { fetchTokenMap, swapUsd } from "@/lib/pricing";
import { getDb } from "@/lib/store";

export const dynamic = "force-dynamic";

function startOfUtcDay(t: number): number {
  const d = new Date(t);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

// Not real people: the app's read-only quote wallet and the burn address
// (both can appear as requesters; neither has a private key owner).
const NON_USER = new Set([
  "0x0000000000000000000000000000000000000000",
  "0x000000000000000000000000000000000000dead",
]);

function isUserWallet(w: string): boolean {
  return Boolean(w) && !NON_USER.has(w.toLowerCase());
}

async function siteReachable(): Promise<{ up: boolean; ms: number | null }> {
  const base = process.env.NEXA_API_URL ?? "http://localhost:3000";
  const started = Date.now();
  try {
    const res = await fetch(`${base}/api/rwa/status`, {
      cache: "no-store",
      signal: AbortSignal.timeout(4_000),
    });
    return { up: res.ok, ms: Date.now() - started };
  } catch {
    return { up: false, ms: null };
  }
}

/** Sell-side USD of successful swaps in [since, now); unpriced rows counted apart. */
function volumeSince(rows: ActivityRow[], sinceT: number, map: Awaited<ReturnType<typeof fetchTokenMap>>) {
  let usd = 0;
  let unpriced = 0;
  for (const r of rows) {
    if (r.t < sinceT || r.kind !== "swap" || !r.ok) continue;
    const v = swapUsd(r, map);
    if (v === null) unpriced++;
    else usd += v;
  }
  return { usd, unpriced };
}

/** Dashboard roll-up: today's activity, volume, feed health, site reachability. */
export async function GET() {
  try {
    const [activity, db, site, tokenMap] = await Promise.all([
      readActivity(500),
      getDb(),
      siteReachable(),
      fetchTokenMap(),
    ]);
    const now = Date.now();
    const today = startOfUtcDay(now);
    const todays = activity.filter((r) => r.t >= today);
    const wallets = new Set(
      todays.filter((r) => isUserWallet(r.wallet)).map((r) => r.wallet.toLowerCase()),
    );
    const usersTotal = new Set(
      activity.filter((r) => isUserWallet(r.wallet)).map((r) => r.wallet.toLowerCase()),
    ).size;
    const last = activity[0] ?? null;
    const vol24 = volumeSince(activity, now - 86_400_000, tokenMap);
    const volToday = volumeSince(activity, today, tokenMap);
    return NextResponse.json({
      ok: true,
      stats: {
        quotes24h: activity.filter((r) => r.kind === "quote" && r.t > now - 86_400_000).length,
        swaps24h: activity.filter((r) => r.kind === "swap" && r.t > now - 86_400_000).length,
        quotesToday: todays.filter((r) => r.kind === "quote").length,
        swapsToday: todays.filter((r) => r.kind === "swap").length,
        volumeTodayUsd: volToday.usd,
        volume24hUsd: vol24.usd,
        volumeUnpriced24h: vol24.unpriced,
        walletsToday: wallets.size,
        usersTotal,
        failuresToday: todays.filter((r) => !r.ok).length,
        notifications: db.notifications.length,
        maintenance: db.settings.maintenance.enabled,
        auditCount: db.audit.length,
        lastEventAt: last?.t ?? null,
        site,
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "stats unavailable" }, { status: 500 });
  }
}
