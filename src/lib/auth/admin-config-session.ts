import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getAdminEmail } from "@/lib/auth/constants";
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
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || !password) return false;

  const client = createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error } = await client.auth.signInWithPassword({
    email: getAdminEmail(),
    password,
  });

  return !error;
}
