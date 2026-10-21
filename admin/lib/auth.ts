// Session + password verification for the admin app.
// Token format: "<expiresAtMs>.<hmac>" - stateless, no server-side session table.

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "nexa_admin_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET is not set (admin/.env.local)");
  return s;
}

function hmac(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("hex");
}

/** Constant-time password check against ADMIN_PASSWORD. */
export function checkPassword(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const a = createHmac("sha256", "pw:").update(input).digest();
  const b = createHmac("sha256", "pw:").update(expected).digest();
  return timingSafeEqual(a, b);
}

/** Signed, expiring session token. */
export function signSession(): { token: string; maxAgeSec: number } {
  const exp = Date.now() + SESSION_TTL_MS;
  const token = `${exp}.${hmac(String(exp))}`;
  return { token, maxAgeSec: Math.floor(SESSION_TTL_MS / 1000) };
}

export function verifySession(token: string | undefined | null): boolean {
  if (!token) return false;
  const dot = token.indexOf(".");
  if (dot <= 0) return false;
  const expStr = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!/^\d+$/.test(expStr)) return false;
  const expected = hmac(expStr);
  const a = Buffer.from(sig, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  if (!timingSafeEqual(a, b)) return false;
  return Number(expStr) > Date.now();
}

/** Random non-secret id helper (audit rows, notification ids). */
export function newId(): string {
  return randomBytes(6).toString("hex");
}
