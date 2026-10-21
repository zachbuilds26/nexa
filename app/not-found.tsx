import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page not found | Nexa",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-[720px] flex-col items-center px-4 py-24 text-center">
      <span className="tnum text-6xl font-semibold text-accent">404</span>
      <h1 className="mt-4 text-xl font-semibold text-fg">Page not found</h1>
      <p className="mt-2 max-w-sm text-sm text-dim">
        We couldn&apos;t find that page. Nothing was sent or signed.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="inline-flex h-11 items-center rounded-xl border border-line-strong bg-btn-grey px-6 text-sm font-semibold text-fg transition-colors hover:bg-fill-strong"
        >
          Back home
        </Link>
        <Link
          href="/trade/swap"
          className="inline-flex h-11 items-center rounded-xl bg-accent px-6 text-sm font-semibold text-ink scanlines transition-colors hover:bg-accent-hover"
        >
          Start trading
        </Link>
      </div>
    </div>
  );
}
