import { Suspense } from "react";
import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import { WrongNetworkBanner } from "@/components/layout/WrongNetworkBanner";
import { MaintenanceBanner } from "@/components/layout/MaintenanceBanner";
import { Skeleton } from "@/components/ui/Skeleton";

// Header/MobileNav read usePathname(), which is runtime-only data - under
// cacheComponents it must sit inside <Suspense> or it blocks prerendering of
// every route (see docs/FRICTION.md). Fallbacks keep the fixed-bar geometry.
function HeaderFallback() {
  return (
    <div className="fixed inset-x-0 top-0 z-50 bg-ink" aria-hidden>
      <div className="mx-auto flex h-14 max-w-[1536px] items-center px-4 lg:h-16 lg:px-8">
        <Skeleton className="h-5 w-32" />
      </div>
    </div>
  );
}

function MobileNavFallback() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 px-3 pb-3 md:hidden" aria-hidden>
      <div className="mx-auto grid h-14 max-w-[440px] grid-cols-5 place-items-center rounded-full border border-line bg-surface-3 px-1.5 py-1.5">
        <Skeleton className="h-5 w-5 rounded-full" />
        <Skeleton className="h-5 w-5 rounded-full" />
        <Skeleton className="h-5 w-5 rounded-full" />
        <Skeleton className="h-5 w-5 rounded-full" />
        <Skeleton className="h-5 w-5 rounded-full" />
      </div>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={<HeaderFallback />}>
        <Header />
      </Suspense>
      <main className="flex-1 pb-20 pt-14 md:pb-0 lg:pt-16">
        <MaintenanceBanner />
        <WrongNetworkBanner />
        {children}
      </main>
      <Suspense fallback={<MobileNavFallback />}>
        <MobileNav />
      </Suspense>
    </>
  );
}
