import { cookies } from "next/headers";
import { hmacSha256Hex, timingSafeEqualHex } from "@/lib/auth/web-hmac";
import { getAdminEmail } from "@/lib/auth/constants";
import { verifyPasswordForEmail } from "@/lib/auth/location-unlock";
import {
  ADMIN_LOCATION_UNLOCK_COOKIE,
  isAdminLocationUnlockCookieFresh,
} from "@/lib/auth/admin-location-unlock-cookie";
const TTL_MS = 2 * 60 * 60 * 1000; // 2h

import { getLocationUnlockSecret } from "@/lib/env/server";

async function sign(payload: string): Promise<string> {
  return hmacSha256Hex(getLocationUnlockSecret(), payload);
}

async function encodeToken(untilMs: number): Promise<string> {
  const payload = String(untilMs);
  return `${payload}.${await sign(payload)}`;
}

async function decodeToken(token: string): Promise<number | null> {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = await sign(payload);
  if (!timingSafeEqualHex(sig, expected)) return null;
  const until = Number(payload);
  if (!Number.isFinite(until)) return null;
  return until;
}

export async function isAdminLocationUnlockTokenValid(
  token: string | undefined | null
): Promise<boolean> {
  if (!isAdminLocationUnlockCookieFresh(token)) return false;
  if (!token) return false;
  const until = await decodeToken(token);
  return until != null;
}

export async function isAdminLocationUnlocked(): Promise<boolean> {
  const jar = await cookies();
  return await isAdminLocationUnlockTokenValid(jar.get(ADMIN_LOCATION_UNLOCK_COOKIE)?.value);
}

/** Timestamp expirare sesiune unlock (ms), sau null dacă lipsește / expirată. */
export async function getAdminLocationUnlockUntilMs(): Promise<number | null> {
  const jar = await cookies();
  const token = jar.get(ADMIN_LOCATION_UNLOCK_COOKIE)?.value;
  if (!isAdminLocationUnlockCookieFresh(token) || !token) return null;
  const until = await decodeToken(token);
  if (until == null || until <= Date.now()) return null;
  return until;
}

export async function setAdminLocationUnlock(): Promise<void> {
  const until = Date.now() + TTL_MS;
  const jar = await cookies();
  jar.set(ADMIN_LOCATION_UNLOCK_COOKIE, await encodeToken(until), {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
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
