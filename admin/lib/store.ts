import { newId } from "@/lib/auth";
import { db, ensureSchema } from "@/lib/db";

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

const AUDIT_MAX = 500;
const DEFAULT_SETTINGS: Settings = { maintenance: { enabled: false, message: "" } };

function timestamp(value: unknown): number {
  return value instanceof Date ? value.getTime() : new Date(String(value)).getTime();
}

function parseSettings(value: unknown): Settings {
  if (!value || typeof value !== "object") return DEFAULT_SETTINGS;
  const maintenance = (value as Settings).maintenance;
  return {
    maintenance: {
      enabled: !!maintenance?.enabled,
      message: typeof maintenance?.message === "string" ? maintenance.message.slice(0, 400) : "",
    },
  };
}

export async function getDb(): Promise<Db> {
  const [notifications, settings, audit] = await Promise.all([
    listNotifications(),
    getSettings(),
    listAudit(),
  ]);
  return { notifications, settings, audit };
}

export async function listNotifications(): Promise<AdminNotification[]> {
  await ensureSchema();
  const sql = db();
  const rows = await sql`
    select id, title, body, published_at
    from notifications
    order by published_at desc
  `;
  return rows.map((row) => ({
    id: String(row.id),
    title: String(row.title),
    body: String(row.body),
    at: timestamp(row.published_at),
  }));
}

export async function createNotification(input: {
  title: string;
  body: string;
}): Promise<AdminNotification> {
  await ensureSchema();
  const sql = db();
  const item = {
    id: newId(),
    title: input.title.slice(0, 120),
    body: input.body.slice(0, 1000),
  };
  const rows = await sql`
    insert into notifications (id, title, body)
    values (${item.id}, ${item.title}, ${item.body})
    returning published_at
  `;
  return { ...item, at: rows[0] ? timestamp(rows[0].published_at) : Date.now() };
}

export async function updateNotification(
  id: string,
  input: { title: string; body: string },
): Promise<AdminNotification | null> {
  await ensureSchema();
  const sql = db();
  const rows = await sql`
    update notifications
    set title = ${input.title.slice(0, 120)}, body = ${input.body.slice(0, 1000)}
    where id = ${id}
    returning id, title, body, published_at
  `;
  const row = rows[0];
  if (!row) return null;
  return {
    id: String(row.id),
    title: String(row.title),
    body: String(row.body),
    at: timestamp(row.published_at),
  };
}

export async function deleteNotification(id: string): Promise<boolean> {
  await ensureSchema();
  const sql = db();
  const rows = await sql`delete from notifications where id = ${id} returning id`;
  return rows.length > 0;
}

export async function getSettings(): Promise<Settings> {
  await ensureSchema();
  const sql = db();
  const rows = await sql`select value from settings where key = 'maintenance' limit 1`;
  return rows[0] ? parseSettings(rows[0].value) : DEFAULT_SETTINGS;
}

export async function saveSettings(next: Settings): Promise<Settings> {
  await ensureSchema();
  const sql = db();
  const maintenance = {
    enabled: !!next.maintenance?.enabled,
    message: typeof next.maintenance?.message === "string" ? next.maintenance.message.slice(0, 400) : "",
  };
  await sql`
    insert into settings (key, value, updated_at)
    values ('maintenance', ${JSON.stringify(maintenance)}::jsonb, now())
    on conflict (key) do update set value = excluded.value, updated_at = now()
  `;
  return { maintenance };
}

export async function listAudit(): Promise<AuditRow[]> {
  await ensureSchema();
  const sql = db();
  const rows = await sql`
    select id, action, detail, created_at
    from audit
    order by created_at desc
    limit ${AUDIT_MAX}
  `;
  return rows.map((row) => ({
    id: String(row.id),
    at: timestamp(row.created_at),
    action: String(row.action),
    detail: typeof row.detail === "string" ? row.detail.slice(0, 200) : "",
  }));
}

export async function recordAudit(action: string, detail = ""): Promise<void> {
  await ensureSchema();
  const sql = db();
  await sql`
    insert into audit (id, action, detail)
    values (${newId()}, ${action.slice(0, 80)}, ${detail.slice(0, 200)})
  `;
  await sql`
    delete from audit
    where id not in (select id from audit order by created_at desc limit ${AUDIT_MAX})
  `;
}
