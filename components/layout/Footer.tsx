import Link from "next/link";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="hidden border-t border-line px-6 py-3 sm:block">
      <div className="mx-auto flex max-w-[1536px] flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[13px] text-dim">
        <div className="flex items-center gap-2.5">
          <Logo className="h-4 w-4 text-accent" />
          <span className="text-sm font-bold text-fg">Nexa</span>
        </div>
        <nav className="flex items-center gap-5">
          <Link href="/trade" className="transition-colors hover:text-fg">
            Trade
          </Link>
          <Link href="/earn" className="transition-colors hover:text-fg">
            Earn
          </Link>
          <Link href="/borrow" className="transition-colors hover:text-fg">
            Borrow
          </Link>
        </nav>
      </div>
    </footer>
  );
}
