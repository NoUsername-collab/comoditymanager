import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { getAdminEmail } from "@/lib/auth/constants";
import { verifyPasswordForEmail } from "@/lib/auth/location-unlock";
import {
  ADMIN_LOCATION_UNLOCK_COOKIE,
  isAdminLocationUnlockCookieFresh,
} from "@/lib/auth/admin-location-unlock-cookie";
const TTL_MS = 2 * 60 * 60 * 1000; // 2h

import { getLocationUnlockSecret } from "@/lib/env/server";

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

export function isAdminLocationUnlockTokenValid(
  token: string | undefined | null
): boolean {
  if (!isAdminLocationUnlockCookieFresh(token)) return false;
  if (!token) return false;
  const until = decodeToken(token);
  return until != null;
}

export async function isAdminLocationUnlocked(): Promise<boolean> {
  const jar = await cookies();
  return isAdminLocationUnlockTokenValid(jar.get(ADMIN_LOCATION_UNLOCK_COOKIE)?.value);
}

/** Timestamp expirare sesiune unlock (ms), sau null dacă lipsește / expirată. */
export async function getAdminLocationUnlockUntilMs(): Promise<number | null> {
  const jar = await cookies();
  const token = jar.get(ADMIN_LOCATION_UNLOCK_COOKIE)?.value;
  if (!isAdminLocationUnlockCookieFresh(token) || !token) return null;
  const until = decodeToken(token);
  if (until == null || until <= Date.now()) return null;
  return until;
}

export async function setAdminLocationUnlock(): Promise<void> {
  const until = Date.now() + TTL_MS;
  const jar = await cookies();
  jar.set(ADMIN_LOCATION_UNLOCK_COOKIE, encodeToken(until), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(TTL_MS / 1000),
  });
}

export async function clearAdminLocationUnlock(): Promise<void> {
  const jar = await cookies();
  jar.delete(ADMIN_LOCATION_UNLOCK_COOKIE);
}

/** Verifică parola contului admin în Supabase fără a schimba sesiunea operatorului. */
export async function verifyAdminPassword(password: string): Promise<boolean> {
  return verifyPasswordForEmail(getAdminEmail(), password);
}
