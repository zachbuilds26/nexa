import { NextResponse } from "next/server";
import { deleteNotification, recordAudit, updateNotification } from "@/lib/store";

type Params = { params: Promise<{ id: string }> };

function readInput(body: unknown): { title: string; body: string } | null {
  if (!body || typeof body !== "object") return null;
  const o = body as { title?: unknown; body?: unknown };
  if (typeof o.title !== "string" || typeof o.body !== "string") return null;
  const title = o.title.trim();
  const text = o.body.trim();
  if (!title || title.length > 120 || !text || text.length > 500) return null;
  return { title, body: text };
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid body" }, { status: 400 });
  }
  const input = readInput(raw);
  if (!input) {
    return NextResponse.json({ ok: false, error: "title/body required" }, { status: 400 });
  }
  try {
    const item = await updateNotification(id, input);
    if (!item) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
    await recordAudit("notification.update", `${id} "${item.title}"`);
    return NextResponse.json({ ok: true, item });
  } catch {
    return NextResponse.json({ ok: false, error: "store unavailable" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  try {
    const removed = await deleteNotification(id);
    if (!removed) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
    await recordAudit("notification.delete", id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "store unavailable" }, { status: 500 });
  }
}
