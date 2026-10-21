"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { BellRing } from "lucide-react";
import {
  fetchRemoteNotifications,
  getReadSnapshot,
  getServerReadSnapshot,
  notifDate,
  NOTIFICATIONS,
  saveReadIds,
  subscribeReadIds,
} from "@/lib/notifications";

/**
 * Header bell: red dot while any notification is unread, opens a card with
 * the feed. Opening the card marks everything read, so the dot clears.
 * The card has a pointer tip aimed at the bell; on mobile it drops full
 * width below the header with the pointer at the bell's measured position.
 *
 * Feed source: the admin console's public endpoint when it is running
 * (NEXT_PUBLIC_ADMIN_URL), otherwise the bundled list in lib/notifications.
 */
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [ring, setRing] = useState(false);
  const [ptr, setPtr] = useState<{ mobile: boolean; left?: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  // localStorage as an external store: no mount-effect setState, stable snapshot.
  const readIds = useSyncExternalStore(
    subscribeReadIds,
    getReadSnapshot,
    getServerReadSnapshot,
  );

  const { data: feed } = useQuery({
    queryKey: ["admin-notifications"],
    queryFn: fetchRemoteNotifications,
    staleTime: 15_000,
    refetchInterval: 60_000,
    retry: false,
  });
  const items = feed ?? NOTIFICATIONS;

  // Close on outside click / Escape.
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

  const unread = items.filter((n) => !readIds.includes(n.id));

  function toggle() {
    // Restart the ring animation on every click (re-mount the class via rAF).
    setRing(false);
    requestAnimationFrame(() => setRing(true));
    const next = !open;
    setOpen(next);
    if (next) {
      // Aim the pointer at the bell: measure it, then place the tip after
      // the card mounts (desktop anchors to the right edge instead).
      const el = btnRef.current;
      if (el) {
        const r = el.getBoundingClientRect();
        const mobile = window.matchMedia("(max-width: 639px)").matches;
        setPtr(
          mobile
            ? { mobile: true, left: r.left + r.width / 2 - 16 - 6 }
            : { mobile: false },
        );
      }
      if (unread.length > 0) {
        saveReadIds(items.map((n) => n.id));
      }
    } else {
      setPtr(null);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={btnRef}
        type="button"
        aria-label={
          unread.length > 0
            ? `Notifications, ${unread.length} new`
            : "Notifications"
        }
        aria-expanded={open}
        onClick={toggle}
        className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-dim transition-colors hover:bg-fill hover:text-fg"
      >
        <BellRing
          className={`h-5 w-5 fill-current ${ring ? "bell-ring" : ""}`}
          strokeWidth={1.7}
          onAnimationEnd={() => setRing(false)}
        />
        {unread.length > 0 ? (
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-down ring-2 ring-ink" />
        ) : null}
      </button>

      {open ? (
        <div className="fixed left-4 right-4 top-[60px] z-50 sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-80">
          <div className="overflow-hidden rounded-xl border border-line bg-surface-3 shadow-2xl shadow-black/40">
            <div className="flex items-center gap-1.5 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.16em] text-dim">
              <BellRing className="h-3.5 w-3.5 fill-current" strokeWidth={1.7} />
              Notifications
            </div>
            <div className="max-h-[70vh] overflow-y-auto sm:max-h-80">
              {items.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-dim">
                  No notifications yet.
                </p>
              ) : (
                items.map((n) => {
                  const isRead = readIds.includes(n.id);
                  return (
                    <div key={n.id} className="border-t border-line px-4 py-3">
                      <div className="flex items-start gap-2">
                        {!isRead ? (
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-down" />
                        ) : null}
                        <div className="min-w-0">
                          <p
                            className={`text-sm ${
                              isRead ? "text-dim" : "font-semibold text-fg"
                            }`}
                          >
                            {n.title}
                          </p>
                          <p className="mt-0.5 text-xs leading-relaxed text-dim">
                            {n.body}
                          </p>
                          <p className="tnum mt-1.5 text-[11px] text-dim/60">
                            {notifDate(n.at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          {ptr ? (
            <span
              aria-hidden="true"
              style={ptr.mobile && ptr.left !== undefined ? { left: ptr.left } : undefined}
              className={`absolute -top-1.5 h-3 w-3 rotate-45 border-l border-t border-line bg-surface-3 ${
                ptr.mobile ? "" : "right-3"
              }`}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
