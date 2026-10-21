"use client";

import { useState, type FormEvent } from "react";
import { Check, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { PageHeader, Card, EmptyState, ErrorState, LoadingRow, PendingLabel } from "@/components/ui";
import { useFetch } from "@/components/useFetch";

type Notif = { id: string; title: string; body: string; at: number };
type ListRes = { ok: boolean; items: Notif[] };

const DATE_FMT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

function fmt(at: number): string {
  return DATE_FMT.format(new Date(at));
}

export default function NotificationsPage() {
  const list = useFetch<ListRes>("/api/admin/notifications", []);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ title: string; body: string }>({ title: "", body: "" });
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const items = list.data?.ok ? list.data.items : [];

  async function send(path: string, method: string, body?: unknown): Promise<boolean> {
    const res = await fetch(path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    if (!res.ok || !json?.ok) {
      setFormError(json?.error ?? `Request failed (${res.status})`);
      return false;
    }
    setFormError(null);
    list.reload();
    return true;
  }

  function startCreate() {
    setCreating(true);
    setEditingId(null);
    setDraft({ title: "", body: "" });
    setFormError(null);
    setConfirmDelete(null);
  }

  function startEdit(n: Notif) {
    setEditingId(n.id);
    setCreating(false);
    setDraft({ title: n.title, body: n.body });
    setFormError(null);
    setConfirmDelete(null);
  }

  function cancel() {
    setCreating(false);
    setEditingId(null);
    setDraft({ title: "", body: "" });
    setFormError(null);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const title = draft.title.trim();
    const body = draft.body.trim();
    if (!title || !body) {
      setFormError("Title and message are both required.");
      return;
    }
    setBusy(true);
    try {
      const ok = creating
        ? await send("/api/admin/notifications", "POST", { title, body })
        : editingId
          ? await send(`/api/admin/notifications/${editingId}`, "PATCH", { title, body })
          : false;
      if (ok) cancel();
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string) {
    if (busy) return;
    setBusy(true);
    try {
      await send(`/api/admin/notifications/${id}`, "DELETE");
      setConfirmDelete(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle="Messages shown in the bell on the Nexa site. Published changes appear on the next site poll."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          {list.loading ? (
            <LoadingRow rows={3} />
          ) : list.error || !list.data?.ok ? (
            <ErrorState message={list.error ?? "Feed unavailable"} onRetry={list.reload} />
          ) : items.length === 0 ? (
            <Card>
              <EmptyState message="No notifications yet. Publish the first one." />
            </Card>
          ) : (
            <ul className="space-y-3">
              {items.map((n) => {
                const editing = editingId === n.id;
                if (editing) {
                  return (
                    <Card key={n.id}>
                      <form onSubmit={onSubmit}>
                        <input
                          autoFocus
                          aria-label="Notification title"
                          value={draft.title}
                          onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                          maxLength={120}
                          placeholder="Title"
                          className="h-10 w-full rounded-lg border border-line bg-surface-1 px-3 text-sm text-fg placeholder:text-dim/50"
                        />
                        <textarea
                          aria-label="Notification message"
                          value={draft.body}
                          onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
                          maxLength={500}
                          rows={3}
                          placeholder="Message"
                          className="mt-3 w-full resize-none rounded-lg border border-line bg-surface-1 px-3 py-2 text-sm text-fg placeholder:text-dim/50"
                        />
                        <div className="mt-3 flex items-center gap-2">
                          <button
                            type="submit"
                            disabled={busy}
                            className="flex h-9 items-center gap-1.5 rounded-lg bg-accent px-3 text-sm font-semibold text-ink transition-colors hover:bg-accent-hover disabled:opacity-50"
                          >
                            {busy ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.7} /> : <Check className="h-4 w-4" strokeWidth={1.7} />}
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={cancel}
                            className="flex h-9 items-center gap-1.5 rounded-lg bg-fill-strong px-3 text-sm text-dim transition-colors hover:bg-surface-hover hover:text-fg"
                          >
                            <X className="h-4 w-4" strokeWidth={1.7} />
                            Cancel
                          </button>
                        </div>
                      </form>
                    </Card>
                  );
                }
                return (
                  <Card key={n.id} className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-fg">{n.title}</p>
                      <p className="mt-1 text-sm leading-relaxed text-dim">{n.body}</p>
                      <p className="tnum mt-2 text-xs text-dim/70">Published {fmt(n.at)}</p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() => startEdit(n)}
                        aria-label={`Edit ${n.title}`}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-dim transition-colors hover:bg-fill hover:text-fg"
                      >
                        <Pencil className="h-4 w-4" strokeWidth={1.7} />
                      </button>
                      {confirmDelete === n.id ? (
                        <button
                          type="button"
                          onClick={() => onDelete(n.id)}
                          disabled={busy}
                          className="flex h-8 items-center gap-1 rounded-lg bg-down/15 px-2 text-xs font-semibold text-down transition-colors hover:bg-down/25 disabled:opacity-50"
                        >
                          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.7} /> : <Check className="h-3.5 w-3.5" strokeWidth={1.7} />}
                          Confirm
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(n.id)}
                          aria-label={`Delete ${n.title}`}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-dim transition-colors hover:bg-fill hover:text-down"
                        >
                          <Trash2 className="h-4 w-4" strokeWidth={1.7} />
                        </button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </ul>
          )}
        </div>

        <div className="lg:sticky lg:top-8 lg:self-start">
          <Card>
            <h2 className="mb-4 text-[11px] font-medium uppercase tracking-[0.16em] text-dim">
              {creating ? "New notification" : editingId ? "Edit notification" : "Publish"}
            </h2>
            {creating || editingId ? (
              <form onSubmit={onSubmit}>
                <label htmlFor="ntitle" className="mb-1.5 block text-xs text-dim">
                  Title
                </label>
                <input
                  id="ntitle"
                  value={draft.title}
                  onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                  maxLength={120}
                  placeholder="Scheduled maintenance"
                  className="h-10 w-full rounded-lg border border-line bg-surface-1 px-3 text-sm text-fg placeholder:text-dim/50"
                />
                <label htmlFor="nbody" className="mb-1.5 mt-4 block text-xs text-dim">
                  Message
                </label>
                <textarea
                  id="nbody"
                  value={draft.body}
                  onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
                  maxLength={500}
                  rows={4}
                  placeholder="What should users know?"
                  className="w-full resize-none rounded-lg border border-line bg-surface-1 px-3 py-2 text-sm text-fg placeholder:text-dim/50"
                />
                <p className="tnum mt-1.5 text-right text-xs text-dim/60">
                  {draft.body.length}/500
                </p>
                {formError ? <p className="mt-2 text-sm text-down">{formError}</p> : null}
                <div className="mt-3 flex gap-2">
                  <button
                    type="submit"
                    disabled={busy}
                    className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-accent text-sm font-semibold text-ink transition-colors hover:bg-accent-hover disabled:opacity-50"
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.7} /> : <Check className="h-4 w-4" strokeWidth={1.7} />}
                    {editingId ? "Save changes" : "Publish"}
                  </button>
                  <button
                    type="button"
                    onClick={cancel}
                    className="h-10 rounded-lg bg-fill-strong px-4 text-sm text-dim transition-colors hover:bg-surface-hover hover:text-fg"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-3">
                <p className="text-sm leading-relaxed text-dim">
                  Send a message to every visitor&apos;s bell. It shows as unread until they
                  open the bell once.
                </p>
                <button
                  type="button"
                  onClick={startCreate}
                  className="flex h-10 w-full items-center justify-center gap-1.5 rounded-lg bg-accent text-sm font-semibold text-ink transition-colors hover:bg-accent-hover"
                >
                  <Plus className="h-4 w-4" strokeWidth={1.7} />
                  New notification
                </button>
                {formError ? <p className="text-sm text-down">{formError}</p> : null}
                {busy ? <PendingLabel /> : null}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
