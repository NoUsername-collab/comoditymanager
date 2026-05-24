/** Verificare rapidă expiry — safe pentru Edge Middleware (fără HMAC). */
export function isAdminLocationUnlockCookieFresh(
  token: string | undefined | null
): boolean {
  if (!token) return false;
  const [payload] = token.split(".");
  if (!payload) return false;
  const until = Number(payload);
  return Number.isFinite(until) && until > Date.now();
}

export const ADMIN_LOCATION_UNLOCK_COOKIE = "casaemil_admin_location_unlock";
