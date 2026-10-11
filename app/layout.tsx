import type { Metadata } from "next";
import { Suspense } from "react";
import "@fontsource/montserrat/400.css";
import "@fontsource/montserrat/500.css";
import "@fontsource/montserrat/600.css";
import "@fontsource/montserrat/700.css";
import "@fontsource/sora/400.css";
import "@fontsource/sora/500.css";
import "@fontsource/sora/600.css";
import "@fontsource/sora/700.css";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileNav } from "@/components/layout/MobileNav";
import { WrongNetworkBanner } from "@/components/layout/WrongNetworkBanner";
import { Skeleton } from "@/components/ui/Skeleton";

const SITE_TITLE = "Nexa | Trade, Earn & Borrow Tokenized Stocks";
const SITE_DESCRIPTION =
  "Buy and sell tokenized stocks around the clock, earn yield on idle shares, and borrow against your portfolio. Self-custodial on BNB Smart Chain.";

export const metadata: Metadata = {
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  // On Vercel Next derives this from the deployment URL; set
  // NEXT_PUBLIC_SITE_URL to override elsewhere (local previews, custom domain).
  metadataBase: process.env.NEXT_PUBLIC_SITE_URL
    ? new URL(process.env.NEXT_PUBLIC_SITE_URL)
    : undefined,
  openGraph: {
    type: "website",
    siteName: "Nexa",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
};

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
    <div
      className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-surface-3 md:hidden"
      aria-hidden
    >
      <div className="grid h-16 grid-cols-5 place-items-center">
        <Skeleton className="h-5 w-5 rounded-full" />
        <Skeleton className="h-5 w-5 rounded-full" />
        <Skeleton className="h-5 w-5 rounded-full" />
        <Skeleton className="h-5 w-5 rounded-full" />
        <Skeleton className="h-5 w-5 rounded-full" />
      </div>
    </div>
  );
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full">
      <body className="flex min-h-full flex-col">
        <Providers>
          <Suspense fallback={<HeaderFallback />}>
            <Header />
          </Suspense>
          <main className="flex-1 pb-16 pt-14 md:pb-0 lg:pt-16">
            <WrongNetworkBanner />
            {children}
          </main>
          <Footer />
          <Suspense fallback={<MobileNavFallback />}>
            <MobileNav />
          </Suspense>
        </Providers>
      </body>
    </html>
  );
}
