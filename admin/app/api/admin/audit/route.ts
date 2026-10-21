import { NextResponse } from "next/server";
import { listAudit } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ ok: true, items: await listAudit() });
  } catch {
    return NextResponse.json({ ok: false, error: "store unavailable" }, { status: 500 });
  }
}
