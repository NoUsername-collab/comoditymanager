/**
 * Where the anti-bot check runs: the platform's domain and its subdomains
 * (which one Turnstile widget covers), and local development hosts. A
 * guesthouse's own domain is left out: Turnstile accepts only the hostnames
 * registered on the widget, and a check that cannot load must never stop a
 * guest's booking. Those domains keep the per-IP limits.
 */
export function turnstileCoversHost(
  host: string | null | undefined,
  platformDomain: string,
): boolean {
  const name = (host ?? "").toLowerCase().replace(/:\d+$/, "").trim();
  const platform = platformDomain.toLowerCase().trim();
  if (!name || !platform) return false;
  if (name === "localhost" || name.endsWith(".localhost")) return true;
  return name === platform || name.endsWith(`.${platform}`);
}

/** The platform domain both the browser and the server compare against. */
export function turnstilePlatformDomain(): string {
  return process.env.NEXT_PUBLIC_PLATFORM_DOMAIN?.trim().toLowerCase() || "zalmox.app";
}
