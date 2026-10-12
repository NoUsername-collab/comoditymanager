import { safeInternalPath } from "@/lib/security/safe-path";
import { cookies } from "next/headers";
import { hmacSha256Hex, timingSafeEqualString } from "@/lib/auth/web-hmac";
import { ALPHA_GATE_COOKIE } from "@/lib/auth/alpha-gate-cookie";
import { getLocationUnlockSecret } from "@/lib/env/server";

const TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 zile

async function sign(payload: string): Promise<string> {
  return hmacSha256Hex(getLocationUnlockSecret(), payload);
}

async function encodeToken(untilMs: number): Promise<string> {
  const payload = String(untilMs);
  return `${payload}.${await sign(payload)}`;
}

export async function setAlphaGateUnlock(): Promise<void> {
  const until = Date.now() + TTL_MS;
  const jar = await cookies();
  jar.set(ALPHA_GATE_COOKIE, await encodeToken(until), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(TTL_MS / 1000),
  });
}

export function verifyAlphaGatePassword(password: string): boolean {
  const expected = process.env.ALPHA_GATE_PASSWORD?.trim();
  if (!expected || !password) return false;
  return timingSafeEqualString(password, expected);
}

export function sanitizeAlphaGateReturnPath(next: string | null | undefined): string {
  return safeInternalPath(next, "/");
}
