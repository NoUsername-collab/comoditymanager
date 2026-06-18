/**
 * Edge-safe admin location unlock token verification (Web Crypto HMAC).
 * Aligns proxy.ts with server-side validation in admin-config-session.ts.
 */

import { isAdminLocationUnlockCookieFresh } from "@/lib/auth/admin-location-unlock-cookie";

function getEdgeLocationUnlockSecret(): string {
  const secret = process.env.ADMIN_LOCATION_UNLOCK_SECRET?.trim();
  if (secret && secret.length >= 32) return secret;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (serviceRole) return serviceRole;
  return "dev-insecure-unlock-secret";
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function signPayloadEdge(payload: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Full token validation for Edge Middleware — expiry + HMAC. */
export async function isAdminLocationUnlockTokenValidEdge(
  token: string | undefined | null
): Promise<boolean> {
  if (!isAdminLocationUnlockCookieFresh(token)) return false;
  if (!token) return false;

  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;

  const expected = await signPayloadEdge(payload, getEdgeLocationUnlockSecret());
  if (!timingSafeEqualHex(sig, expected)) return false;

  const until = Number(payload);
  return Number.isFinite(until) && until > Date.now();
}
