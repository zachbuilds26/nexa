import { NextResponse } from "next/server";
import { getSettings } from "@/lib/store";
import { withCors } from "@/lib/cors";

// Public site settings the Nexa frontend needs (maintenance banner).
// CORS-open: the site runs on a different origin. No-store: toggling
// maintenance must reflect on the very next poll.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await getSettings();
    return withCors(
      NextResponse.json(
        { ok: true, maintenance: settings.maintenance },
        { headers: { "Cache-Control": "no-store" } },
      ),
    );
  } catch {
    return withCors(NextResponse.json({ ok: false, error: "store unavailable" }, { status: 500 }));
  }
}
