/** Edge-safe helpers (fără Node crypto / getServerEnv). */

export function isAlphaGateEnabled(): boolean {
  if (process.env.NODE_ENV === "development") return false;
  const pwd = process.env.ALPHA_GATE_PASSWORD?.trim();
  return Boolean(pwd && pwd.length > 0);
}

export function isAlphaGateExemptPath(path: string): boolean {
  return path === "/alpha-gate" || path.startsWith("/api/");
}
