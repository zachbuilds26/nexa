"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChartNoAxesCombined, HandCoins, Repeat, WavesLadder } from "lucide-react";
import { WalletFilled } from "@/components/ui/WalletFilled";
import { ConnectButton } from "./ConnectButton";
import { HeaderMenu } from "./HeaderMenu";
import { HeaderSearch } from "./HeaderSearch";
import { NotificationBell } from "./NotificationBell";

const NAV = [
  { href: "/trade/swap", label: "Trade", icon: Repeat },
  { href: "/stocks", label: "Stocks", icon: ChartNoAxesCombined },
  { href: "/earn/pools", label: "Earn", icon: WavesLadder },
  { href: "/borrow/markets", label: "Borrow", icon: HandCoins },
  { href: "/portfolio", label: "Portfolio", icon: WalletFilled },
];

export function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 border-b bg-ink ${
        scrolled ? "border-line" : "border-transparent"
      }`}
    >
      <div className="relative mx-auto flex h-14 max-w-[1536px] items-center gap-3 px-4 md:gap-6 lg:h-16 lg:px-8">
        <div className="flex shrink-0 items-center gap-0">
          <Link
            href="/"
            aria-label="Nexa"
            className="flex items-center rounded-full px-1 py-1 transition-colors hover:bg-fill"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/nexa-logo.png" alt="" className="h-3.5 w-auto" />
          </Link>
        </div>

        {/* Menu trigger: on touch it filters to the end of the row (after
            Connect); from md up it tucks in beside the wordmark again. */}
        <div className="order-last -ml-1 md:order-none md:-ml-5">
          <HeaderMenu />
        </div>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => {
            const active =
              pathname.startsWith(item.href) ||
              (item.href === "/trade/swap" && pathname.startsWith("/trade")) ||
              (item.href === "/earn/pools" && pathname.startsWith("/earn")) ||
              (item.href === "/borrow/markets" && pathname.startsWith("/borrow"));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
                  active ? "text-accent" : "text-dim hover:text-fg"
                }`}
              >
                {active ? <Icon className="h-4 w-4" strokeWidth={1.7} /> : null}
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <HeaderSearch />
          <NotificationBell />
          <ConnectButton />
        </div>
      </div>
    </header>
  );
}
