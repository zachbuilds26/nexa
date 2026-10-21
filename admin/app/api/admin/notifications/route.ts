import { NextResponse } from "next/server";
import { createNotification, listNotifications, recordAudit } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ ok: true, items: await listNotifications() });
  } catch {
    return NextResponse.json({ ok: false, error: "store unavailable" }, { status: 500 });
  }
}

function readInput(body: unknown): { title: string; body: string } | null {
  if (!body || typeof body !== "object") return null;
  const o = body as { title?: unknown; body?: unknown };
  if (typeof o.title !== "string" || typeof o.body !== "string") return null;
  const title = o.title.trim();
  const text = o.body.trim();
  if (!title || title.length > 120 || !text || text.length > 500) return null;
  return { title, body: text };
}

export async function POST(request: Request) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid body" }, { status: 400 });
  }
  const input = readInput(raw);
  if (!input) {
    return NextResponse.json(
      { ok: false, error: "title/body required (1-120 / 1-500 chars)" },
      { status: 400 },
    );
  }
  try {
    const item = await createNotification(input);
    await recordAudit("notification.create", `${item.id} "${item.title}"`);
    return NextResponse.json({ ok: true, item }, { status: 201 });
  } catch {
    return NextResponse.json({ ok: false, error: "store unavailable" }, { status: 500 });
  }
}
