import { Loader2, TriangleAlert } from "lucide-react";

export function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header className="mb-6">
      <h1 className="text-2xl font-semibold text-fg">{title}</h1>
      <p className="mt-1 text-sm text-dim">{subtitle}</p>
    </header>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`shimmer rounded bg-fill ${className}`} aria-hidden="true" />;
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-line bg-surface-3 p-5 ${className}`}>
      {children}
    </section>
  );
}

export function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-4 text-[11px] font-medium uppercase tracking-[0.16em] text-dim">
      {children}
    </h2>
  );
}

export function EmptyState({ message }: { message: string }) {
  return <p className="py-6 text-center text-sm text-dim">{message}</p>;
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-8 text-center">
      <TriangleAlert className="h-5 w-5 text-down" strokeWidth={1.7} />
      <p className="max-w-sm text-sm text-dim">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg bg-fill-strong px-4 py-2 text-sm text-fg transition-colors hover:bg-surface-hover"
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}

export function LoadingRow({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

export function PendingLabel() {
  return (
    <span className="flex items-center gap-2 text-sm text-dim">
      <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.7} />
      Working
    </span>
  );
}

export function StatTile({ label, value, tone = "default", title }: { label: string; value: string; tone?: "default" | "up" | "down" | "warn"; title?: string }) {
  const toneClass =
    tone === "up" ? "text-up" : tone === "down" ? "text-down" : tone === "warn" ? "text-warn" : "text-fg";
  return (
    <div className="rounded-xl border border-line bg-surface-3 px-4 py-4" title={title}>
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-dim">{label}</p>
      <p className={`tnum mt-1.5 text-xl font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}
