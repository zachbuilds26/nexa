import { NextResponse } from "next/server";
import { listNotifications } from "@/lib/store";
import { withCors } from "@/lib/cors";

// Public feed consumed by the Nexa site's NotificationBell. No auth - it is
// exactly what any visitor's bell would show anyway. CORS-open: the site runs
// on a different origin. No-store: a deleted notification must disappear on
// the very next poll, never linger in a browser cache.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const items = await listNotifications();
    return withCors(
      NextResponse.json(
        { ok: true, items },
        { headers: { "Cache-Control": "no-store" } },
      ),
    );
  } catch {
    return withCors(NextResponse.json({ ok: false, error: "store unavailable" }, { status: 500 }));
  }
}
