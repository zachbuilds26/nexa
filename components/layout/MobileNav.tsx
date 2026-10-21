"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartNoAxesCombined, HandCoins, Repeat, WavesLadder } from "lucide-react";
import { WalletFilled } from "@/components/ui/WalletFilled";

const ITEMS = [
  { href: "/trade/swap", label: "Trade", icon: Repeat },
  { href: "/stocks", label: "Stocks", icon: ChartNoAxesCombined },
  { href: "/earn/pools", label: "Earn", icon: WavesLadder },
  { href: "/borrow/markets", label: "Borrow", icon: HandCoins },
  { href: "/portfolio", label: "Portfolio", icon: WalletFilled },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-surface-3 md:hidden"
    >
      <div className="grid grid-cols-5">
        {ITEMS.map((item) => {
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
