import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

type Sql = NeonQueryFunction<false, false>;

let client: Sql | null = null;
let schema: Promise<void> | null = null;

function connectionString(): string {
  const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return url;
}

export function db(): Sql {
  if (!client) client = neon(connectionString());
  return client;
}

async function createSchema(): Promise<void> {
  const sql = db();

  await sql`
    create table if not exists activity (
      id bigserial primary key,
      created_at timestamptz not null default now(),
      kind text not null,
      wallet text not null default '',
      sell text not null default '',
      buy text not null default '',
      amount text not null default '',
      ok boolean not null default false
    )
  `;
  await sql`create index if not exists activity_created_at_idx on activity (created_at desc)`;

  await sql`
    create table if not exists notifications (
      id text primary key,
      title text not null,
      body text not null,
      published_at timestamptz not null default now()
    )
  `;
  await sql`create index if not exists notifications_published_at_idx on notifications (published_at desc)`;

  await sql`
    create table if not exists settings (
      key text primary key,
      value jsonb not null,
      updated_at timestamptz not null default now()
    )
  `;

  await sql`
    create table if not exists audit (
      id text primary key,
      created_at timestamptz not null default now(),
      action text not null,
      detail text not null default ''
    )
  `;
  await sql`create index if not exists audit_created_at_idx on audit (created_at desc)`;

  await sql`
    insert into settings (key, value)
    values ('maintenance', ${JSON.stringify({ enabled: false, message: "" })}::jsonb)
    on conflict (key) do nothing
  `;

  const claimed = await sql`
    insert into settings (key, value)
    values ('notifications_seeded', ${JSON.stringify(true)}::jsonb)
    on conflict (key) do nothing
    returning key
  `;

  if (claimed.length > 0) {
    await sql`
      insert into notifications (id, title, body, published_at)
      values
        (
          'welcome',
          'Welcome to Nexa',
          'Your self-custodial desk for tokenized stocks on BNB Chain. Pick a stock and trade 24/7.',
          ${"2026-10-10T00:00:00.000Z"}::timestamptz
        ),
        (
          'auto-slippage',
          'Smarter trade settings',
          'Auto slippage now sizes itself from price impact, and expert mode skips the confirm step. Both live in the swap settings.',
          ${"2026-10-15T00:00:00.000Z"}::timestamptz
        )
      on conflict (id) do nothing
    `;
  }
}

export function ensureSchema(): Promise<void> {
  if (!schema) {
    schema = createSchema().catch((error) => {
      schema = null;
      throw error;
    });
  }
  return schema;
}
