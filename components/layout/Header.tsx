"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TrendingUp, HandCoins, Repeat, WalletCards, WavesLadder } from "lucide-react";
import { ConnectButton } from "./ConnectButton";
import { NetworkSwitch } from "./NetworkSwitch";

const NAV = [
  { href: "/trade", label: "Trade", icon: Repeat },
  { href: "/stocks", label: "Stocks", icon: TrendingUp },
  { href: "/earn", label: "Earn", icon: WavesLadder },
  { href: "/borrow", label: "Borrow", icon: HandCoins },
  { href: "/portfolio", label: "Portfolio", icon: WalletCards },
];

export function Header() {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-ink">
      <div
        className={`relative mx-auto flex h-14 max-w-[1536px] items-center gap-6 px-4 lg:h-16 lg:px-8${
          isHome ? " justify-center md:justify-start" : ""
        }`}
      >
        <Link
          href="/"
          className="flex items-center rounded-full px-1 py-1 transition-colors hover:bg-fill"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/nexa-logo.png" alt="Nexa" className="h-5 w-auto" />
        </Link>

        {!isHome ? (
          <>
            <nav className="hidden items-center gap-1 md:flex">
              {NAV.map((item) => {
                const active =
                  pathname.startsWith(item.href) ||
                  (item.href === "/stocks" && pathname.startsWith("/stock"));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
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
              <NetworkSwitch />
              <ConnectButton />
            </div>
          </>
        ) : (
          <div className="ml-auto hidden items-center md:flex">
            <Link
              href="/trade"
              className="inline-flex h-9 items-center rounded-xl bg-accent px-4 text-sm font-semibold text-ink scanlines transition-colors hover:bg-accent-hover"
            >
              Get started
            </Link>
          </div>
        )}
      </div>
      <div className="h-px bg-line" />
    </header>
  );
}
