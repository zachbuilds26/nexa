import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/auth";
import { recordAudit } from "@/lib/store";

export async function POST() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  await recordAudit("logout");
  return NextResponse.json({ ok: true });
}
