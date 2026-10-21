export type AppNotification = {
  id: string;
  title: string;
  body: string;
  at: number;
};

const READ_KEY = "nexa.notif.read";
const READ_EVENT = "nexa.notif.read-changed";

let cachedRaw: string | null | undefined;
let cachedIds: string[] = [];

function parseReadIds(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const v: unknown = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/** useSyncExternalStore subscription for the read-ids list (same tab + other tabs). */
export function subscribeReadIds(cb: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === READ_KEY) cb();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(READ_EVENT, cb);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(READ_EVENT, cb);
  };
}

/**
 * Snapshot for useSyncExternalStore. Memoized by raw string so repeated
 * calls return the same array reference while the value is unchanged.
 */
export function getReadSnapshot(): string[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(READ_KEY);
  } catch {
    raw = null;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedIds = parseReadIds(raw);
  }
  return cachedIds;
}

/** Stable server snapshot: nothing read yet during SSR/hydration. */
const SERVER_READ_IDS: string[] = [];
export function getServerReadSnapshot(): string[] {
  return SERVER_READ_IDS;
}

/**
 * Pull the live feed from the admin console (admin/ app, port 3001).
 * Returns null when the admin is not running or the payload is malformed -
 * callers fall back to the bundled list below.
 * no-store: without it the browser happily replays a cached response and a
 * notification deleted in the admin keeps showing for over a minute.
 */
export async function fetchRemoteNotifications(): Promise<AppNotification[] | null> {
  const base = process.env.NEXT_PUBLIC_ADMIN_URL;
  if (!base) return null;
  try {
    const res = await fetch(`${base}/api/public/notifications`, {
      cache: "no-store",
      signal: AbortSignal.timeout(4_000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { ok?: boolean; items?: unknown };
    if (!json?.ok || !Array.isArray(json.items)) return null;
    const items = json.items.filter(
      (n): n is AppNotification =>
        !!n &&
        typeof (n as AppNotification).id === "string" &&
        typeof (n as AppNotification).title === "string" &&
        typeof (n as AppNotification).body === "string" &&
        typeof (n as AppNotification).at === "number" &&
        Number.isFinite((n as AppNotification).at),
    );
    return items.sort((a, b) => b.at - a.at);
  } catch {
    return null;
  }
}

/**
 * The notification feed. To push a message to users, append an entry here
 * with a fresh unique id - it will show a red dot until each user has
 * opened/closed the bell once.
 */
export const NOTIFICATIONS: AppNotification[] = [
  {
    id: "welcome",
    title: "Welcome to Nexa",
    body: "Your self-custodial desk for tokenized stocks on BNB Chain. Pick a stock and trade 24/7.",
    at: Date.UTC(2026, 9, 10),
  },
  {
    id: "auto-slippage",
    title: "Smarter trade settings",
    body: "Auto slippage now sizes itself from price impact, and expert mode skips the confirm step. Both live in the swap settings.",
    at: Date.UTC(2026, 9, 15),
  },
];

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function notifDate(at: number): string {
  const d = new Date(at);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

export function saveReadIds(ids: string[]): void {
  try {
    localStorage.setItem(READ_KEY, JSON.stringify(ids));
  } catch {
    // storage blocked - read state just won't persist
  }
  // Invalidate the snapshot cache and notify subscribers so the bell re-renders.
  cachedRaw = undefined;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(READ_EVENT));
  }
}
