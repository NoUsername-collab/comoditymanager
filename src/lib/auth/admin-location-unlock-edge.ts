/**
 * Edge-safe admin location unlock token verification (Web Crypto HMAC).
 * Aligns proxy.ts with server-side validation in admin-config-session.ts.
 */

import { isAdminLocationUnlockCookieFresh } from "@/lib/auth/admin-location-unlock-cookie";
import { hmacSha256Hex, timingSafeEqualHex } from "@/lib/auth/web-hmac";
import { isProductionRuntime } from "@/lib/security/production-runtime";

function getEdgeLocationUnlockSecret(): string | null {
  const secret = process.env.ADMIN_LOCATION_UNLOCK_SECRET?.trim();
  if (secret && secret.length >= 32) return secret;
  if (isProductionRuntime()) return null;
  return "dev-insecure-unlock-secret";
}

/** Full token validation for Edge Middleware — expiry + HMAC. */
export async function isAdminLocationUnlockTokenValidEdge(
  token: string | undefined | null
): Promise<boolean> {
  if (!isAdminLocationUnlockCookieFresh(token)) return false;
  if (!token) return false;

  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;

  const secret = getEdgeLocationUnlockSecret();
  if (!secret) return false;

  const expected = await hmacSha256Hex(secret, payload);
  if (!timingSafeEqualHex(sig, expected)) return false;

  const until = Number(payload);
  return Number.isFinite(until) && until > Date.now();
}
