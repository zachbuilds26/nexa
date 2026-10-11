"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TrendingUp, HandCoins, Repeat, WalletCards, WavesLadder } from "lucide-react";

const ITEMS = [
  { href: "/trade", label: "Trade", icon: Repeat },
  { href: "/stocks", label: "Stocks", icon: TrendingUp },
  { href: "/earn", label: "Earn", icon: WavesLadder },
  { href: "/borrow", label: "Borrow", icon: HandCoins },
  { href: "/portfolio", label: "Portfolio", icon: WalletCards },
];

export function MobileNav() {
  const pathname = usePathname();

  if (pathname === "/") return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-surface-3 md:hidden">
      <div className="grid grid-cols-5">
        {ITEMS.map((item) => {
          const active =
            pathname.startsWith(item.href) ||
            (item.href === "/stocks" && pathname.startsWith("/stock"));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 py-2.5 transition-colors ${
                active ? "text-accent" : "text-dim"
              }`}
            >
              <Icon className="h-5 w-5" strokeWidth={1.7} />
              <span className="text-[11px] leading-none">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
