import { NextResponse } from "next/server";
import { getSettings, recordAudit, saveSettings, type Settings } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ ok: true, settings: await getSettings() });
  } catch {
    return NextResponse.json({ ok: false, error: "store unavailable" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid body" }, { status: 400 });
  }
  if (!raw || typeof raw !== "object") {
    return NextResponse.json({ ok: false, error: "invalid body" }, { status: 400 });
  }
  const m = (raw as { maintenance?: unknown }).maintenance;
  if (!m || typeof m !== "object") {
    return NextResponse.json({ ok: false, error: "maintenance object required" }, { status: 400 });
  }
  const enabled = !!(m as { enabled?: unknown }).enabled;
  const messageRaw = (m as { message?: unknown }).message;
  const message = typeof messageRaw === "string" ? messageRaw.trim().slice(0, 400) : "";
  if (enabled && !message) {
    return NextResponse.json(
      { ok: false, error: "A banner message is required while maintenance is on" },
      { status: 400 },
    );
  }
  try {
    const next: Settings = { maintenance: { enabled, message } };
    const settings = await saveSettings(next);
    await recordAudit("settings.update", `maintenance ${enabled ? "on" : "off"}`);
    return NextResponse.json({ ok: true, settings });
  } catch {
    return NextResponse.json({ ok: false, error: "store unavailable" }, { status: 500 });
  }
}
