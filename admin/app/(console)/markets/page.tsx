"use client";

import { RefreshCw } from "lucide-react";
import { PageHeader, Card, EmptyState, ErrorState, LoadingRow } from "@/components/ui";
import { useFetch } from "@/components/useFetch";

type Row = {
  symbol: string;
  ticker: string;
  contract: string;
  price: string | null;
  chgPct: string | null;
  quoteVolume: string | null;
};

type Status = { openState: boolean; marketStatus: string | null };
type Res = { ok: boolean; status?: Status | null; rows?: Row[]; error?: string };

const VOL_FMT = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

function fmtVol(v: string | null): string {
  if (!v) return "-";
  const n = Number(v);
  if (!Number.isFinite(n)) return "-";
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${VOL_FMT.format(n)}`;
}

function fmtPrice(p: string | null): string {
  if (!p) return "-";
  const n = Number(p);
  if (!Number.isFinite(n)) return p;
  return n.toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 });
}

function fmtChg(c: string | null): { text: string; cls: string } {
  if (!c) return { text: "-", cls: "text-dim" };
  const n = Number(c);
  if (!Number.isFinite(n)) return { text: c, cls: "text-dim" };
  const sign = n > 0 ? "+" : "";
  return { text: `${sign}${n.toFixed(2)}%`, cls: n > 0 ? "text-up" : n < 0 ? "text-down" : "text-dim" };
}

export default function MarketsPage() {
  const markets = useFetch<Res>("/api/admin/markets", []);
  const rows = markets.data?.ok ? (markets.data.rows ?? []) : [];

  return (
    <div>
      <PageHeader
        title="Markets"
        subtitle="Tokenized stock universe with live reference pricing."
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        {markets.data?.status ? (
          <span className="flex items-center gap-2 text-sm">
            <span
              className={`h-1.5 w-1.5 rounded-full ${markets.data.status.openState ? "bg-up" : "bg-down"}`}
            />
            <span className="text-dim">
              Market {markets.data.status.openState ? "open" : "closed"}
              {markets.data.status.marketStatus &&
              !/^(open|closed)$/i.test(markets.data.status.marketStatus)
                ? ` - ${markets.data.status.marketStatus}`
                : ""}
            </span>
          </span>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={markets.reload}
          className="flex h-8 items-center gap-1.5 rounded-lg bg-fill-strong px-3 text-sm text-dim transition-colors hover:bg-surface-hover hover:text-fg"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${markets.loading ? "animate-spin" : ""}`} strokeWidth={1.7} />
          Refresh
        </button>
      </div>

      <Card>
        {markets.loading && rows.length === 0 ? (
          <LoadingRow rows={6} />
        ) : markets.error || !markets.data?.ok ? (
          <ErrorState
            message={markets.error ?? markets.data?.error ?? "Markets unavailable"}
            onRetry={markets.reload}
          />
        ) : rows.length === 0 ? (
          <EmptyState message="Universe returned no assets." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-[11px] uppercase tracking-[0.14em] text-dim">
                  <th className="pb-3 pr-4 font-medium">Symbol</th>
                  <th className="pb-3 pr-4 font-medium">Ticker</th>
                  <th className="pb-3 pr-4 text-right font-medium">Price</th>
                  <th className="pb-3 pr-4 text-right font-medium">24h</th>
                  <th className="pb-3 pr-4 text-right font-medium">Volume</th>
                  <th className="pb-3 font-medium">Contract</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r) => {
                  const chg = fmtChg(r.chgPct);
                  return (
                    <tr key={r.symbol} className="transition-colors hover:bg-fill">
                      <td className="py-2.5 pr-4 font-semibold text-fg">{r.symbol}</td>
                      <td className="py-2.5 pr-4 text-dim">{r.ticker}</td>
                      <td className="tnum py-2.5 pr-4 text-right text-fg">{fmtPrice(r.price)}</td>
                      <td className={`tnum py-2.5 pr-4 text-right ${chg.cls}`}>{chg.text}</td>
                      <td className="tnum py-2.5 pr-4 text-right text-dim">{fmtVol(r.quoteVolume)}</td>
                      <td className="tnum py-2.5 font-mono text-xs text-dim">
                        {r.contract ? `${r.contract.slice(0, 10)}…${r.contract.slice(-4)}` : "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <p className="mt-3 text-xs text-dim/70">
        Prices come from Binance spot via the Nexa server and are cached for 15 seconds.
      </p>
    </div>
  );
}
