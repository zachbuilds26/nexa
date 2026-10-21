"use client";

import { ErrorBlock } from "@/components/ui/StateBlocks";

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-[720px] px-4 py-16">
      <h1 className="text-xl font-semibold text-fg">Something went wrong</h1>
      <p className="mt-1 text-sm text-dim">
        This view hit an unexpected error. Nothing was sent or signed.
      </p>
      <div className="mt-4 rounded-xl border border-line bg-surface-3 p-4">
        <ErrorBlock
          message={
            error.message?.split("\n")[0].slice(0, 200) || "Unexpected error"
          }
          onRetry={reset}
        />
      </div>
    </div>
  );
}
