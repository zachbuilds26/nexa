"use client";

import type { ReactNode } from "react";
import { DotsBackdrop } from "@/components/ui/DotsBackdrop";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";

export function BorrowShell({
  view,
  children,
}: {
  view: "markets" | "positions";
  children: ReactNode;
}) {
  return (
    <div className="relative">
      <DotsBackdrop />
      <div className="relative mx-auto max-w-[1200px] px-4 py-6 lg:px-8">
        <div className="mb-5">
          <h1 className="text-2xl font-semibold text-fg">Borrow</h1>
          <p className="mt-1 max-w-2xl text-sm text-dim">
            Post a listed bStock as collateral and borrow stables against it,
            through Lista Lending on BNB Chain.
          </p>
        </div>

        <div className="flex flex-col gap-6">
          <SegmentedTabs
            ariaLabel="Markets or positions"
            value={view}
            hrefs={{ markets: "/borrow/markets", positions: "/borrow/positions" }}
            tabs={[
              { key: "markets", label: "Markets" },
              { key: "positions", label: "Positions" },
            ]}
          />
          {children}
        </div>
      </div>
    </div>
  );
}
