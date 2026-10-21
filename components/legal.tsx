"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  BookOpen,
  Home,
  List,
  Menu,
  Scale,
  X,
} from "lucide-react";

type TocEntry = readonly [id: string, label: string];
type PageKey = "privacy" | "terms" | "docs";

const GROUPS: {
  label: string;
  icon: typeof Scale;
  items: { key: PageKey; href: string; label: string }[];
}[] = [
  {
    label: "Policy",
    icon: Scale,
    items: [
      { key: "privacy", href: "/privacy", label: "Privacy Policy" },
      { key: "terms", href: "/terms", label: "Terms & Conditions" },
    ],
  },
  {
    label: "Docs",
    icon: BookOpen,
    items: [{ key: "docs", href: "/docs", label: "How Nexa works" }],
  },
];

/**
 * Docs frame: brand lockup bar, sticky left nav (grouped links, active pill),
 * prose column with breadcrumb, and a sticky "On this page" rail. Below lg the
 * sidebar becomes a drawer.
 */
export function LegalShell({
  page,
  label,
  title,
  updated,
  intro,
  toc,
  prev,
  next,
  children,
}: {
  page: PageKey;
  /** Short brand-lockup word for the header (Privacy / Terms / Docs). */
  label: string;
  title: string;
  updated?: string;
  intro?: ReactNode;
  toc: readonly TocEntry[];
  prev?: { href: string; label: string };
  next?: { href: string; label: string };
  children: ReactNode;
}) {
  const [drawer, setDrawer] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [activeToc, setActiveToc] = useState<string>(toc[0]?.[0] ?? "");

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setIsDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawer(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawer]);

  useEffect(() => {
    const onScroll = () => {
      const ids = toc.map(([id]) => id);
      let current = ids[0] ?? "";
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= 120) current = id;
      }
      // The last section can never cross y=120 (pagination sits below it),
      // so pin it once the page is scrolled to the end.
      const atBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      const last = ids[ids.length - 1];
      if (atBottom && last) current = last;
      setActiveToc(current);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    // Sync once after mount so a scroll that happened before hydration is not missed.
    const raf = requestAnimationFrame(() => window.dispatchEvent(new Event("scroll")));
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [toc]);

  const crumb = page === "docs" ? "Docs" : "Policy";

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-ink">
        <div className="flex h-14 items-center gap-3 px-4 lg:h-16 lg:px-8">
          <Link
            href="/"
            className="flex items-center rounded-lg px-1 py-1 transition-colors hover:bg-fill"
            aria-label="Nexa home"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/nexa-logo.png" alt="Nexa" className="h-4 w-auto" />
          </Link>
          <span className="h-4 w-px bg-line" aria-hidden />
          <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-dim">
            {label}
          </span>
          <button
            type="button"
            aria-label="Open navigation"
            aria-expanded={drawer}
            onClick={() => setDrawer(true)}
            className="ml-auto flex h-9 w-9 items-center justify-center rounded-full text-dim transition-colors hover:bg-fill hover:text-fg lg:hidden"
          >
            <Menu size={19} strokeWidth={1.7} />
          </button>
        </div>
      </header>

      {drawer ? (
        <div
          className="fixed inset-0 z-50 bg-ink/60 lg:hidden"
          onClick={() => setDrawer(false)}
          aria-hidden
        />
      ) : null}

      <div className="flex">
        <aside
          inert={!isDesktop && !drawer}
          className={`fixed inset-y-0 left-0 z-[55] w-80 max-w-[85vw] overflow-y-auto border-r border-line bg-ink px-5 py-6 transition-transform lg:sticky lg:top-16 lg:z-30 lg:h-[calc(100vh-4rem)] lg:w-64 lg:max-w-none lg:translate-x-0 lg:shrink-0 ${
            drawer ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="mb-5 flex items-center justify-between lg:hidden">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-dim">
              Menu
            </span>
            <button
              type="button"
              aria-label="Close navigation"
              onClick={() => setDrawer(false)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-dim transition-colors hover:bg-fill hover:text-fg"
            >
              <X size={17} strokeWidth={1.7} />
            </button>
          </div>

          <nav aria-label="Docs sections" className="space-y-6">
            {GROUPS.map((group) => {
              const Icon = group.icon;
              return (
                <div key={group.label}>
                  <p className="flex items-center gap-2 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-dim">
                    <Icon size={13} strokeWidth={1.7} aria-hidden />
                    {group.label}
                  </p>
                  <ul className="mt-2 space-y-1">
                    {group.items.map((item) => {
                      const active = item.key === page;
                      return (
                        <li key={item.key}>
                          <Link
                            href={item.href}
                            aria-current={active ? "page" : undefined}
                            onClick={() => setDrawer(false)}
                            className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
                              active
                                ? "bg-fill font-semibold text-accent"
                                : "text-dim hover:bg-fill hover:text-fg"
                            }`}
                          >
                            {item.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-8 lg:px-8 lg:py-10">
          <div className="max-w-[46rem]">
            <nav aria-label="Breadcrumb" className="mb-5 flex items-center gap-1.5 text-xs font-semibold text-dim">
              <Link href="/" aria-label="Home" className="transition-colors hover:text-fg">
                <Home size={13} strokeWidth={1.7} />
              </Link>
              <span>{crumb}</span>
            </nav>

            <header>
              <h1 className="text-2xl font-semibold text-fg lg:text-3xl">{title}</h1>
              {updated ? <p className="mt-2 text-xs text-dim">Last updated {updated}</p> : null}
              {intro ? <div className="mt-4 text-sm leading-relaxed text-dim">{intro}</div> : null}
            </header>

            <div className="mt-2">{children}</div>

            {prev || next ? (
              <nav className="mt-10 flex items-stretch gap-3">
                {prev ? (
                  <Link
                    href={prev.href}
                    className="group flex flex-1 items-center gap-2 rounded-xl border border-line px-4 py-3 text-sm text-dim transition-colors hover:border-line-strong hover:text-fg"
                  >
                    <ArrowLeft size={15} strokeWidth={1.7} aria-hidden />
                    <span className="truncate">{prev.label}</span>
                  </Link>
                ) : null}
                {next ? (
                  <Link
                    href={next.href}
                    className={`group flex items-center gap-2 rounded-xl border border-line px-4 py-3 text-sm text-dim transition-colors hover:border-line-strong hover:text-fg ${
                      prev ? "flex-1 justify-end" : "ml-auto"
                    }`}
                  >
                    <span className="truncate">{next.label}</span>
                    <ArrowRight size={15} strokeWidth={1.7} aria-hidden />
                  </Link>
                ) : null}
              </nav>
            ) : null}
          </div>
        </main>

        <aside className="hidden w-64 shrink-0 border-l border-line px-6 py-10 xl:block xl:sticky xl:top-24 xl:max-h-[calc(100vh-6rem)] xl:self-start xl:overflow-y-auto">
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-dim">
            <List size={13} strokeWidth={1.7} aria-hidden />
            On this page
          </p>
          <nav className="mt-3 space-y-1.5">
            {toc.map(([id, idLabel]) => {
              const active = id === activeToc;
              return (
                <a
                  key={id}
                  href={`#${id}`}
                  className={`block border-l pl-3 text-[13px] leading-snug transition-colors ${
                    active
                      ? "border-accent font-medium text-accent"
                      : "border-transparent text-dim hover:text-fg"
                  }`}
                >
                  {idLabel}
                </a>
              );
            })}
          </nav>
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="mt-6 flex items-center gap-1.5 text-xs font-medium text-dim transition-colors hover:text-fg"
          >
            <ArrowUp size={13} strokeWidth={1.7} aria-hidden />
            Back to top
          </button>
        </aside>
      </div>
    </>
  );
}

export function Section({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="mt-8 scroll-mt-20 border-t border-line pt-6">
      <h2 className="text-base font-semibold text-fg">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-dim">{children}</div>
    </section>
  );
}

export function Bullets({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc space-y-2 pl-5">
      {items.map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </ul>
  );
}

/** Accent in-content link - the docs pages carry the site green. */
export function L({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target={href.startsWith("#") ? undefined : "_blank"}
      rel={href.startsWith("#") ? undefined : "noopener noreferrer"}
      className="font-medium text-accent underline underline-offset-4 decoration-accent/40 transition-colors hover:decoration-accent"
    >
      {children}
    </a>
  );
}
