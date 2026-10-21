"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  Gauge,
  Loader2,
  LogOut,
  Megaphone,
  Settings2,
  LineChart,
} from "lucide-react";

const NAV = [
  { href: "/", label: "Dashboard", icon: Gauge },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/markets", label: "Markets", icon: LineChart },
  { href: "/notifications", label: "Notifications", icon: Megaphone },
  { href: "/settings", label: "Settings", icon: Settings2 },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch("/api/logout", { method: "POST" });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <aside className="border-b border-line bg-surface-1 md:sticky md:top-0 md:h-screen md:w-56 md:shrink-0 md:border-b-0 md:border-r">
      <div className="flex flex-col gap-4 px-4 py-4 md:py-6">
        <Link href="/" className="block">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-accent">
            Nexa
          </p>
          <p className="text-sm text-dim">Admin console</p>
        </Link>

        <nav className="-mx-1 flex gap-1 overflow-x-auto md:mx-0 md:block md:space-y-1 md:overflow-visible">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-sm transition-colors ${
                  active ? "bg-fill-strong text-fg" : "text-dim hover:bg-fill hover:text-fg"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="h-4 w-4 shrink-0" strokeWidth={1.7} />
                {label}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={logout}
          disabled={loggingOut}
          className="flex h-9 items-center gap-2 self-start rounded-lg px-3 text-sm text-dim transition-colors hover:bg-fill hover:text-down disabled:opacity-60"
        >
          {loggingOut ? (
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.7} />
          ) : (
            <LogOut className="h-4 w-4" strokeWidth={1.7} />
          )}
          Sign out
        </button>
      </div>
    </aside>
  );
}
