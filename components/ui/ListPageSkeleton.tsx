import { DotsBackdrop } from "@/components/ui/DotsBackdrop";
import { Skeleton } from "@/components/ui/Skeleton";

export function ListPageSkeleton({
  title,
  subtitle,
  tabs,
  active,
}: {
  title: string;
  subtitle: string;
  tabs: readonly string[];
  active: number;
}) {
  return (
    <div className="relative">
      <DotsBackdrop />
      <div className="relative mx-auto max-w-[1200px] px-4 py-6 lg:px-8">
        <div className="mb-5">
          <h1 className="text-2xl font-semibold text-fg">{title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-dim">{subtitle}</p>
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex w-full max-w-[480px] gap-1 rounded-full border border-line bg-fill p-1">
            {tabs.map((label, i) => (
              <div
                key={label}
                className={`flex h-9 flex-1 items-center justify-center rounded-full px-3 text-sm ${
                  i === active ? "bg-accent/10 font-medium text-accent" : "text-dim"
                }`}
              >
                {label}
              </div>
            ))}
          </div>

          <div className="min-w-0">
            <div className="mb-3 flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-9 w-full sm:w-64" />
            </div>
            <div>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="flex h-12 items-center gap-3 border-t border-line md:h-14"
                >
                  <Skeleton className="h-3.5 w-5" />
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="ml-auto h-4 w-16" />
                  <Skeleton className="hidden h-4 w-16 sm:block" />
                  <Skeleton className="hidden h-4 w-16 md:block" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
