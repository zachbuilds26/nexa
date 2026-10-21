// JSON-file store for admin state. One process, one file: reads are cheap,
// writes go through a promise queue so two requests never interleave.

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { newId } from "@/lib/auth";

export type AdminNotification = {
  id: string;
  title: string;
  body: string;
  /** Publish time, unix ms - same field the Nexa feed reads. */
  at: number;
};

export type Settings = {
  maintenance: {
    enabled: boolean;
    message: string;
  };
};

export type AuditRow = {
  id: string;
  at: number;
  action: string;
  detail: string;
};

type Db = {
  notifications: AdminNotification[];
  settings: Settings;
  audit: AuditRow[];
};

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "db.json");
const AUDIT_MAX = 500;

// Same two entries the Nexa site ships in lib/notifications.ts, so the feed
// does not change the first time the admin connects.
const SEED: Db = {
  notifications: [
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
  ],
  settings: { maintenance: { enabled: false, message: "" } },
  audit: [],
};

let queue: Promise<unknown> = Promise.resolve();

function normalize(raw: unknown): Db | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Partial<Db>;
  if (!Array.isArray(o.notifications) || !o.settings || typeof o.settings !== "object") return null;
  const notifications = o.notifications.filter(
    (n): n is AdminNotification =>
      !!n &&
      typeof n.id === "string" &&
      typeof n.title === "string" &&
      typeof n.body === "string" &&
      typeof n.at === "number",
  );
  const m = (o.settings as Settings).maintenance;
  const settings: Settings = {
    maintenance: {
      enabled: !!m?.enabled,
      message: typeof m?.message === "string" ? m.message.slice(0, 400) : "",
    },
  };
  const audit = Array.isArray(o.audit)
    ? o.audit.filter((r): r is AuditRow => !!r && typeof r.id === "string" && typeof r.action === "string")
    : [];
  return { notifications, settings, audit };
}

async function load(): Promise<Db> {
  try {
    const raw = JSON.parse(await readFile(DB_PATH, "utf8")) as unknown;
    return normalize(raw) ?? SEED;
  } catch {
    return SEED;
  }
}

async function persist(db: Db): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  const tmp = DB_PATH + ".tmp";
  await writeFile(tmp, JSON.stringify(db, null, 2), "utf8");
  await rename(tmp, DB_PATH);
}

/** Read-modify-write under a queue; returns the new db. */
async function mutate<T>(fn: (db: Db) => T): Promise<T> {
  const run = queue.then(async () => {
    const db = await load();
    const result = fn(db);
    await persist(db);
    return result;
  });
  queue = run.catch(() => undefined);
  return run;
}

export function getDb(): Promise<Db> {
  return load();
}

export async function listNotifications(): Promise<AdminNotification[]> {
  const db = await load();
  return [...db.notifications].sort((a, b) => b.at - a.at);
}

export async function createNotification(input: { title: string; body: string }): Promise<AdminNotification> {
  return mutate((db) => {
    const n: AdminNotification = { id: newId(), title: input.title, body: input.body, at: Date.now() };
    db.notifications.push(n);
    return n;
  });
}

export async function updateNotification(
  id: string,
  input: { title: string; body: string },
): Promise<AdminNotification | null> {
  return mutate((db) => {
    const n = db.notifications.find((x) => x.id === id);
    if (!n) return null;
    n.title = input.title;
    n.body = input.body;
    return n;
  });
}

export async function deleteNotification(id: string): Promise<boolean> {
  return mutate((db) => {
    const before = db.notifications.length;
    db.notifications = db.notifications.filter((x) => x.id !== id);
    if (db.notifications.length === before) return false;
    return true;
  });
}

export async function getSettings(): Promise<Settings> {
  const db = await load();
  return db.settings;
}

export async function saveSettings(next: Settings): Promise<Settings> {
  return mutate((db) => {
    db.settings = next;
    return db.settings;
  });
}

export async function listAudit(): Promise<AuditRow[]> {
  const db = await load();
  return [...db.audit].sort((a, b) => b.at - a.at);
}

export async function recordAudit(action: string, detail = ""): Promise<void> {
  await mutate((db) => {
    db.audit.unshift({ id: newId(), at: Date.now(), action, detail: detail.slice(0, 200) });
    if (db.audit.length > AUDIT_MAX) db.audit.length = AUDIT_MAX;
  });
}
