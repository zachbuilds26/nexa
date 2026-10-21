"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2 } from "lucide-react";

export function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!res.ok || !json?.ok) {
        setError(json?.error ?? "Login failed");
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      setError("Network error - is the admin server running?");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-accent">
            Nexa
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-fg">Admin console</h1>
          <p className="mt-2 text-sm text-dim">
            Operations access for the trading desk.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="rounded-xl border border-line bg-surface-3 p-6"
        >
          <label
            htmlFor="password"
            className="mb-2 block text-[11px] font-medium uppercase tracking-[0.16em] text-dim"
          >
            Password
          </label>
          <div className="relative">
            <KeyRound
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dim"
              strokeWidth={1.7}
            />
            <input
              id="password"
              type="password"
              autoFocus
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="ADMIN_PASSWORD"
              className="h-11 w-full rounded-lg border border-line bg-surface-1 pl-9 pr-3 text-sm text-fg placeholder:text-dim/50"
            />
          </div>

          {error ? <p className="mt-3 text-sm text-down">{error}</p> : null}

          <button
            type="submit"
            disabled={pending || password.length === 0}
            className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-accent text-sm font-semibold text-ink transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.7} />
            ) : (
              "Sign in"
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-dim/70">
          Session lasts 7 days. Password lives in admin/.env.local.
        </p>
      </div>
    </main>
  );
}
