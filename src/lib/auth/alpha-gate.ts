import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import {
  ALPHA_GATE_COOKIE,
  isAlphaGateCookieFresh,
} from "@/lib/auth/alpha-gate-cookie";
import { getLocationUnlockSecret } from "@/lib/env/server";

const TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 zile

function sign(payload: string): string {
  return createHmac("sha256", getLocationUnlockSecret()).update(payload).digest("hex");
}

function encodeToken(untilMs: number): string {
  const payload = String(untilMs);
  return `${payload}.${sign(payload)}`;
}

function decodeToken(token: string): number | null {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = sign(payload);
  try {
    const a = Buffer.from(sig, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  const until = Number(payload);
  if (!Number.isFinite(until)) return null;
  return until;
}

export function isAlphaGateTokenValid(
  token: string | undefined | null
): boolean {
  if (!isAlphaGateCookieFresh(token)) return false;
  if (!token) return false;
  return decodeToken(token) != null;
}

export async function isAlphaGateUnlocked(): Promise<boolean> {
  const jar = await cookies();
  return isAlphaGateTokenValid(jar.get(ALPHA_GATE_COOKIE)?.value);
}

export async function setAlphaGateUnlock(): Promise<void> {
  const until = Date.now() + TTL_MS;
  const jar = await cookies();
  jar.set(ALPHA_GATE_COOKIE, encodeToken(until), {
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
  const a = Buffer.from(password);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function sanitizeAlphaGateReturnPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("://")) {
    return "/";
  }
  return next;
}
