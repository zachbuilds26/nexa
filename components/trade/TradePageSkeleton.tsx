import { DotsBackdrop } from "@/components/ui/DotsBackdrop";
import { Skeleton } from "@/components/ui/Skeleton";

export function TradePageSkeleton({ panel }: { panel: "swap" | "chart" }) {
  return (
    <div className="relative">
      <DotsBackdrop />
      <div className="relative mx-auto w-full max-w-[1200px] px-4 pb-6 pt-3 lg:px-8 lg:pt-6">
        <div className="space-y-5 lg:mt-6">
          <div className="mx-auto flex w-full max-w-[480px] gap-1 rounded-full border border-line bg-fill p-1">
            <div className="flex h-9 flex-1 items-center justify-center rounded-full bg-surface-3/50">
              <Skeleton className="h-3.5 w-14" />
            </div>
            <div className="flex h-9 flex-1 items-center justify-center">
              <Skeleton className="h-3.5 w-14" />
            </div>
          </div>
          {panel === "swap" ? (
            <div className="mx-auto w-full max-w-[480px]">
              <Skeleton className="h-[440px] w-full rounded-2xl" />
            </div>
          ) : (
            <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
              <Skeleton className="h-[460px] w-full rounded-xl" />
              <Skeleton className="hidden h-[440px] w-full rounded-2xl lg:block" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
