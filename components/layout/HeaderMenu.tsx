"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Menu } from "lucide-react";
import { DropArrow } from "@/components/ui/DropArrow";

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.451-6.231zm-1.161 17.52h1.833L7.084 4.126H5.117l11.966 15.644z" />
    </svg>
  );
}

const LEGAL = [
  { href: "/privacy", title: "Privacy Policy" },
  { href: "/terms", title: "Terms & Conditions" },
  { href: "/docs", title: "Docs" },
];

const SOCIALS = [
  { href: "https://t.me/zachhct", title: "Telegram", icon: TelegramIcon },
  { href: "https://x.com/nexafinance_", title: "X", icon: XIcon },
];

/**
 * Header menu: a caret on desktop (opens on hover, no click needed) and a
 * hamburger at the right edge on touch (tap). The card pairs policy rows with
 * a north-east arrow and a bare social icon row, and deliberately has no open
 * animation.
 */
export function HeaderMenu() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const openTimer = useRef<number | null>(null);
  const closeTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(
    () => () => {
      if (openTimer.current !== null) window.clearTimeout(openTimer.current);
      if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    },
    [],
  );

  // Hover-open only on pointer devices at desktop widths; touch stays click.
  const hoverCapable = () =>
    typeof window !== "undefined" &&
    window.matchMedia("(hover: hover) and (min-width: 768px)").matches;

  function hoverEnter() {
    if (!hoverCapable()) return;
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    if (open || openTimer.current !== null) return;
    openTimer.current = window.setTimeout(() => {
      openTimer.current = null;
      setOpen(true);
    }, 90);
  }

  function hoverLeave() {
    if (!hoverCapable()) return;
    if (openTimer.current !== null) {
      window.clearTimeout(openTimer.current);
      openTimer.current = null;
    }
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => {
      closeTimer.current = null;
      setOpen(false);
    }, 250);
  }

  return (
    <div
      ref={rootRef}
      className="relative"
      onMouseEnter={hoverEnter}
      onMouseLeave={hoverLeave}
    >
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-dim transition-colors hover:bg-fill hover:text-fg md:h-8 md:w-5"
      >
        <Menu className="h-5 w-5 md:hidden" strokeWidth={1.7} />
        <span className="hidden md:inline-flex">
          <DropArrow open={open} />
        </span>
      </button>

      {open ? (
        <div
          data-menu-card
          className="fixed left-4 right-4 top-[60px] z-50 sm:absolute sm:left-0 sm:right-auto sm:top-auto sm:mt-1.5 sm:w-[240px]"
        >
          <div className="rounded-xl border border-line bg-surface-3 p-2 shadow-2xl shadow-black/40">
            <div>
              {LEGAL.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="group flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm text-dim transition-colors hover:bg-fill hover:text-fg"
                >
                  <span>{l.title}</span>
                  <ArrowUpRight
                    className="h-3.5 w-3.5 shrink-0 text-dim/50 transition-colors group-hover:text-accent group-active:text-accent"
                    strokeWidth={1.7}
                  />
                </Link>
              ))}
            </div>

            <div className="mx-3 my-1.5 border-t border-line" />

            <div className="flex items-center gap-1 px-1 pb-0.5">
              {SOCIALS.map((s) => {
                const Icon = s.icon;
                return (
                  <a
                    key={s.href}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.title}
                    onClick={() => setOpen(false)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-dim transition-colors hover:bg-fill hover:text-accent active:text-accent"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
