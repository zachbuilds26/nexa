import type { Metadata } from "next";
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

// Root layout stays chrome-free (it has to cover all three worlds): the app
// shell (Header, MobileNav, banners) lives in app/(app)/layout.tsx, and the
// policy/docs pages render the LegalShell docs frame.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full">
      <body className="flex min-h-full flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
