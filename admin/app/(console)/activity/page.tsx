"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { PageHeader, Card, EmptyState, ErrorState, LoadingRow } from "@/components/ui";
import { useFetch } from "@/components/useFetch";
import { fmtUsd } from "@/lib/fmt";

type Row = {
  t: number;
  kind: "quote" | "swap" | "approve";
  wallet: string;
  sell: string;
  buy: string;
  amount: string;
  ok: boolean;
  amountHuman: string | null;
  symbol: string | null;
  usd: number | null;
};
type Res = { ok: boolean; items: Row[] };
type StatsRes = { ok: boolean; stats: { volume24hUsd: number } };

const TIME_FMT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const FILTERS = ["all", "quote", "swap", "approve"] as const;
type Filter = (typeof FILTERS)[number];

function short(addr: string): string {
  if (!addr) return "-";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function ActivityPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const activity = useFetch<Res>("/api/admin/activity?limit=200", []);
  const stats = useFetch<StatsRes>("/api/admin/stats", []);
  const rows = activity.data?.ok ? activity.data.items : [];
  const shown = filter === "all" ? rows : rows.filter((r) => r.kind === filter);

  return (
    <div>
      <PageHeader
        title="Activity"
        subtitle="Quotes, swaps, and approvals hitting the desk, newest first."
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`h-8 rounded-lg px-3 text-sm capitalize transition-colors ${
                filter === f ? "bg-fill-strong text-fg" : "text-dim hover:bg-fill hover:text-fg"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <span className="tnum text-sm text-fg" title="Sell-side value of successful swaps in the last 24 hours.">
            <span className="text-dim">Volume 24h </span>
            {stats.data?.ok ? fmtUsd(stats.data.stats.volume24hUsd) : "-"}
          </span>
          <button
            type="button"
            onClick={() => {
              activity.reload();
              stats.reload();
            }}
            className="flex h-8 items-center gap-1.5 rounded-lg bg-fill-strong px-3 text-sm text-dim transition-colors hover:bg-surface-hover hover:text-fg"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${activity.loading ? "animate-spin" : ""}`} strokeWidth={1.7} />
            Refresh
          </button>
        </div>
      </div>

      <Card>
        {activity.loading && rows.length === 0 ? (
          <LoadingRow rows={5} />
        ) : activity.error || !activity.data?.ok ? (
          <ErrorState message={activity.error ?? "Activity log unreadable"} onRetry={activity.reload} />
        ) : shown.length === 0 ? (
          <EmptyState
            message={
              rows.length === 0
                ? "No activity yet - the log fills as users request quotes and swaps."
                : `No ${filter} events in the last 200 rows.`
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-[11px] uppercase tracking-[0.14em] text-dim">
                  <th className="pb-3 pr-4 font-medium">Time</th>
                  <th className="pb-3 pr-4 font-medium">Kind</th>
                  <th className="pb-3 pr-4 font-medium">Wallet</th>
                  <th className="pb-3 pr-4 font-medium">Pair</th>
                  <th className="pb-3 pr-4 font-medium">Amount</th>
                  <th className="pb-3 font-medium">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {shown.map((r, i) => (
                  <tr key={`${r.t}-${i}`}>
                    <td className="tnum py-2.5 pr-4 text-dim">{TIME_FMT.format(r.t)}</td>
                    <td className="py-2.5 pr-4">
                      <span className="rounded bg-fill px-2 py-0.5 text-xs text-fg">{r.kind}</span>
                    </td>
                    <td className="tnum py-2.5 pr-4 font-mono text-xs text-dim">{short(r.wallet)}</td>
                    <td className="tnum py-2.5 pr-4 font-mono text-xs text-dim">
                      {short(r.sell)} → {short(r.buy)}
                    </td>
                    <td className="tnum py-2.5 pr-4 text-dim">
                      {r.amountHuman ? (
                        <span className="text-fg">{r.amountHuman}</span>
                      ) : r.amount ? (
                        r.amount.length > 18 ? `${r.amount.slice(0, 12)}…` : r.amount
                      ) : (
                        "-"
                      )}
                      {r.symbol ? <span className="ml-1">{r.symbol}</span> : null}
                      {r.usd !== null ? <span className="ml-2 text-dim/70">≈ {fmtUsd(r.usd)}</span> : null}
                    </td>
                    <td className={`py-2.5 ${r.ok ? "text-up" : "text-down"}`}>
                      {r.ok ? "OK" : "Failed"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <p className="mt-3 text-xs text-dim/70">
        Showing up to 200 most recent rows. Volume 24h uses the 500 most recent rows and counts
        successful swaps only, priced at live ticker rates; swaps without a live price are excluded.
      </p>
    </div>
  );
}
