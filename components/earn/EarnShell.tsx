"use client";

import type { ReactNode } from "react";
import { DotsBackdrop } from "@/components/ui/DotsBackdrop";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";

export function EarnShell({
  view,
  children,
}: {
  view: "pools" | "deposits";
  children: ReactNode;
}) {
  return (
    <div className="relative">
      <DotsBackdrop />
      <div className="relative mx-auto max-w-[1200px] px-4 py-6 lg:px-8">
        <div className="mb-5">
          <h1 className="text-2xl font-semibold text-fg">Earn</h1>
          <p className="mt-1 max-w-2xl text-sm text-dim">
            Supply USDT, USDC, or a listed bStock into the Venus Core Pool or the
            Native Pool. Rates and TVL are read live from each pool.
          </p>
        </div>

        <div className="flex flex-col gap-6">
          <SegmentedTabs
            ariaLabel="Pools or deposits"
            value={view}
            hrefs={{ pools: "/earn/pools", deposits: "/earn/deposits" }}
            tabs={[
              { key: "pools", label: "Pools" },
              { key: "deposits", label: "Deposits" },
            ]}
          />
          {children}
        </div>
      </div>
    </div>
  );
}
