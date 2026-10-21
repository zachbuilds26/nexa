import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { checkPassword, SESSION_COOKIE, signSession } from "@/lib/auth";
import { clientIp, rateLimit, tooMany } from "@/lib/rateLimit";
import { recordAudit } from "@/lib/store";

export async function POST(request: Request) {
  const ip = clientIp(request);
  if (!rateLimit(`admin-login:${ip}`, 5, 60_000)) return tooMany();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid body" }, { status: 400 });
  }
  const password = typeof (body as { password?: unknown })?.password === "string"
    ? ((body as { password: string }).password as string)
    : "";
  if (!password || !checkPassword(password)) {
    // Small constant delay blunts rapid guessing even between rate windows.
    await new Promise((r) => setTimeout(r, 300));
    return NextResponse.json({ ok: false, error: "Wrong password" }, { status: 401 });
  }

  const { token, maxAgeSec } = signSession();
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSec,
  });
  await recordAudit("login", `ip ${ip}`);
  return NextResponse.json({ ok: true });
}
