"use client";

import { Clock, Globe, ShieldCheck, TriangleAlert } from "lucide-react";
import { PageHeader, Card, CardTitle, ErrorState, LoadingRow, Skeleton, StatTile } from "@/components/ui";
import { useFetch } from "@/components/useFetch";
import { fmtUsd } from "@/lib/fmt";

type Stats = {
  quotes24h: number;
  swaps24h: number;
  quotesToday: number;
  swapsToday: number;
  volumeTodayUsd: number;
  volume24hUsd: number;
  volumeUnpriced24h: number;
  walletsToday: number;
  usersTotal: number;
  failuresToday: number;
  notifications: number;
  maintenance: boolean;
  auditCount: number;
  lastEventAt: number | null;
  site: { up: boolean; ms: number | null };
};

type StatsResponse = { ok: boolean; stats: Stats };

type ActivityResponse = { ok: boolean; items: { t: number; kind: string; wallet: string; ok: boolean }[] };

function relTime(t: number | null): string {
  if (!t) return "No events yet";
  const diff = Date.now() - t;
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

export default function DashboardPage() {
  const stats = useFetch<StatsResponse>("/api/admin/stats", []);
  const activity = useFetch<ActivityResponse>("/api/admin/activity?limit=8", []);

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Desk health, today's flow, and system status." />

      {stats.loading ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 11 }, (_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : stats.error || !stats.data?.ok ? (
        <ErrorState message={stats.error ?? "Stats unavailable"} onRetry={stats.reload} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label="Quotes today" value={String(stats.data.stats.quotesToday)} />
            <StatTile label="Swaps today" value={String(stats.data.stats.swapsToday)} />
            <StatTile label="Wallets today" value={String(stats.data.stats.walletsToday)} />
            <StatTile
              label="Wallets in log"
              value={String(stats.data.stats.usersTotal)}
              title="Unique wallet addresses across the 500 most recent activity rows."
            />
            <StatTile
              label="Failures today"
              value={String(stats.data.stats.failuresToday)}
              tone={stats.data.stats.failuresToday > 0 ? "down" : "default"}
            />
            <StatTile label="Quotes 24h" value={String(stats.data.stats.quotes24h)} />
            <StatTile label="Swaps 24h" value={String(stats.data.stats.swaps24h)} />
            <StatTile
              label="Volume today"
              value={fmtUsd(stats.data.stats.volumeTodayUsd)}
              title="Sell-side USD of successful swaps in the 500 most recent activity rows since 00:00 UTC."
            />
            <StatTile
              label="Volume 24h"
              value={fmtUsd(stats.data.stats.volume24hUsd)}
              title="Sell-side USD of successful swaps in the 500 most recent activity rows over the last 24 hours."
            />
            <StatTile label="Notifications" value={String(stats.data.stats.notifications)} />
            <StatTile
              label="Maintenance"
              value={stats.data.stats.maintenance ? "ON" : "Off"}
              tone={stats.data.stats.maintenance ? "warn" : "default"}
            />
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Card>
              <CardTitle>System</CardTitle>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-dim">
                    <Globe className="h-4 w-4" strokeWidth={1.7} />
                    Nexa site
                  </span>
                  <span className={stats.data.stats.site.up ? "text-up" : "text-down"}>
                    {stats.data.stats.site.up
                      ? `Up (${stats.data.stats.site.ms ?? "?"}ms)`
                      : "Unreachable"}
                  </span>
                </li>
                <li className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-dim">
                    <Clock className="h-4 w-4" strokeWidth={1.7} />
                    Last event
                  </span>
                  <span className="tnum text-fg">{relTime(stats.data.stats.lastEventAt)}</span>
                </li>
                <li className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-dim">
                    <ShieldCheck className="h-4 w-4" strokeWidth={1.7} />
                    Audit entries
                  </span>
                  <span className="tnum text-fg">{stats.data.stats.auditCount}</span>
                </li>
                {stats.data.stats.volumeUnpriced24h > 0 ? (
                  <li className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-dim">
                      <TriangleAlert className="h-4 w-4" strokeWidth={1.7} />
                      Unpriced swaps (24h)
                    </span>
                    <span className="tnum text-warn" title="Swaps whose sell token has no live price - excluded from volume.">
                      {stats.data.stats.volumeUnpriced24h}
                    </span>
                  </li>
                ) : null}
                <li className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-dim">
                    <TriangleAlert className="h-4 w-4" strokeWidth={1.7} />
                    Site feed
                  </span>
                  <span className="text-fg">{stats.data.stats.site.up ? "Live" : "Offline"}</span>
                </li>
              </ul>
            </Card>

            <Card>
              <CardTitle>Recent activity</CardTitle>
              {activity.loading ? (
                <LoadingRow rows={4} />
              ) : activity.error || !activity.data?.ok ? (
                <ErrorState message={activity.error ?? "Activity unreadable"} onRetry={activity.reload} />
              ) : activity.data.items.length === 0 ? (
                <p className="py-6 text-center text-sm text-dim">
                  No quotes or swaps logged yet today.
                </p>
              ) : (
                <ul className="divide-y divide-line text-sm">
                  {activity.data.items.slice(0, 6).map((row, i) => (
                    <li key={`${row.t}-${i}`} className="flex items-center justify-between gap-3 py-2.5">
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          className={`h-1.5 w-1.5 shrink-0 rounded-full ${row.ok ? "bg-up" : "bg-down"}`}
                        />
                        <span className="truncate text-fg">{row.kind}</span>
                        <span className="tnum shrink-0 font-mono text-xs text-dim">
                          {row.wallet ? `${row.wallet.slice(0, 6)}...${row.wallet.slice(-4)}` : "-"}
                        </span>
                      </span>
                      <span className="tnum shrink-0 text-xs text-dim">{relTime(row.t)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
