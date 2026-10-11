import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Static-shell fallback for pages whose content reads searchParams under a
 * <Suspense> boundary. Next.js prerenders the shell with this placeholder and
 * streams the real page once the params promise resolves (blocking-prerender
 * rule - see docs/FRICTION.md).
 */
export function PageFallback({ label = "Loading" }: { label?: string }) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8" aria-busy="true">
      <div className="space-y-3">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-56 w-full rounded-lg" />
        <Skeleton className="h-56 w-full rounded-lg" />
      </div>
      <p className="sr-only">{label}…</p>
    </div>
  );
}
