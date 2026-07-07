/** Verificare rapidă expiry — safe pentru Edge Middleware (fără HMAC). */
export function isAlphaGateCookieFresh(
  token: string | undefined | null
): boolean {
  if (!token) return false;
  const [payload] = token.split(".");
  if (!payload) return false;
  const until = Number(payload);
  return Number.isFinite(until) && until > Date.now();
}

export const ALPHA_GATE_COOKIE = "zalmox_alpha_gate";
