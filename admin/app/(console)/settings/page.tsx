"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, Megaphone, ShieldCheck, TriangleAlert } from "lucide-react";
import { PageHeader, Card, CardTitle, EmptyState, ErrorState, LoadingRow, PendingLabel } from "@/components/ui";
import { useFetch } from "@/components/useFetch";

type Settings = { maintenance: { enabled: boolean; message: string } };
type SettingsRes = { ok: boolean; settings: Settings };
type AuditRes = { ok: boolean; items: { id: string; at: number; action: string; detail: string }[] };

const TIME_FMT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export default function SettingsPage() {
  const settingsQ = useFetch<SettingsRes>("/api/admin/settings", []);
  const auditQ = useFetch<AuditRes>("/api/admin/audit", []);

  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (settingsQ.data?.ok && !hydrated) {
      setEnabled(settingsQ.data.settings.maintenance.enabled);
      setMessage(settingsQ.data.settings.maintenance.message);
      setHydrated(true);
    }
  }, [settingsQ.data, hydrated]);

  async function save() {
    if (busy) return;
    if (enabled && !message.trim()) {
      setError("A banner message is required while maintenance is on.");
      return;
    }
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maintenance: { enabled, message: message.trim() } }),
      });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!res.ok || !json?.ok) {
        setError(json?.error ?? `Save failed (${res.status})`);
        return;
      }
      setSaved(true);
      auditQ.reload();
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  const auditItems = auditQ.data?.ok ? auditQ.data.items : [];

  return (
    <div>
      <PageHeader title="Settings" subtitle="Site-wide switches and the admin audit trail." />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardTitle>Maintenance banner</CardTitle>
          {settingsQ.loading && !hydrated ? (
            <LoadingRow rows={2} />
          ) : settingsQ.error || !settingsQ.data?.ok ? (
            <ErrorState message={settingsQ.error ?? "Settings unavailable"} onRetry={settingsQ.reload} />
          ) : (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-fg">Show banner on Nexa</p>
                  <p className="mt-1 text-sm leading-relaxed text-dim">
                    A full-width notice above the site for scheduled maintenance or incidents.
                    Visitors keep trading - this only informs them.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={enabled}
                  aria-label="Maintenance banner"
                  onClick={() => setEnabled((v) => !v)}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                    enabled ? "bg-accent" : "bg-fill-strong"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-ink transition-transform ${
                      enabled ? "translate-x-[22px]" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>

              <div>
                <label htmlFor="msg" className="mb-1.5 block text-xs text-dim">
                  Banner message
                </label>
                <textarea
                  id="msg"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={400}
                  rows={3}
                  disabled={!enabled}
                  placeholder={enabled ? "We are investigating delayed price updates." : "Turn the banner on to edit."}
                  className="w-full resize-none rounded-lg border border-line bg-surface-1 px-3 py-2 text-sm text-fg placeholder:text-dim/50 disabled:opacity-50"
                />
                <p className="tnum mt-1.5 text-right text-xs text-dim/60">{message.length}/400</p>
              </div>

              {error ? <p className="text-sm text-down">{error}</p> : null}

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={save}
                  disabled={busy}
                  className="flex h-10 items-center gap-1.5 rounded-lg bg-accent px-4 text-sm font-semibold text-ink transition-colors hover:bg-accent-hover disabled:opacity-50"
                >
                  {busy ? (
                    <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.7} />
                  ) : saved ? (
                    <Check className="h-4 w-4" strokeWidth={1.7} />
                  ) : null}
                  {saved ? "Saved" : "Save changes"}
                </button>
                {busy ? <PendingLabel /> : null}
              </div>

              <div className="rounded-lg border border-line bg-surface-1 p-3">
                <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] text-dim">
                  <Megaphone className="h-3.5 w-3.5" strokeWidth={1.7} />
                  Preview
                </p>
                <div
                  className={`mt-2 flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm ${
                    enabled ? "bg-surface-3 text-fg" : "bg-fill text-dim/60"
                  }`}
                >
                  <TriangleAlert
                    className={`h-4 w-4 shrink-0 ${enabled ? "text-warn" : "text-dim/50"}`}
                    strokeWidth={1.7}
                  />
                  <span>{enabled && message ? message : enabled ? "Banner on - message empty" : "Banner off - visitors see nothing"}</span>
                </div>
              </div>
            </div>
          )}
        </Card>

        <div className="lg:sticky lg:top-8 lg:self-start">
          <Card>
            <CardTitle>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.7} />
                Audit trail
              </span>
            </CardTitle>
            {auditQ.loading ? (
              <LoadingRow rows={4} />
            ) : auditQ.error || !auditQ.data?.ok ? (
              <ErrorState message={auditQ.error ?? "Audit unavailable"} onRetry={auditQ.reload} />
            ) : auditItems.length === 0 ? (
              <EmptyState message="No admin actions recorded yet." />
            ) : (
              <ul className="max-h-[420px] space-y-2.5 overflow-y-auto pr-1">
                {auditItems.slice(0, 50).map((row) => (
                  <li key={row.id} className="text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-medium text-fg">{row.action}</span>
                      <span className="tnum shrink-0 text-xs text-dim/70">{TIME_FMT.format(row.at)}</span>
                    </div>
                    {row.detail ? (
                      <p className="truncate text-xs text-dim" title={row.detail}>
                        {row.detail}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
