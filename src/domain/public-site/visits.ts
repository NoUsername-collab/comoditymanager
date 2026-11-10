/*
 * Anonymous visits to the public site (migration 115): what a page view keeps
 * is its path and the site the visitor came from, nothing else.
 */

const BOT = /bot|crawl|spider|slurp|preview|headless|lighthouse|pingdom|monitor|facebookexternalhit|embedly|python|curl|wget/i;

/** Robots, link previews and monitors are not visitors. */
export function isLikelyBot(userAgent: string | null | undefined): boolean {
  const ua = userAgent?.trim() ?? "";
  return ua.length === 0 || BOT.test(ua);
}

/** The page's path, without query or fragment, at most 200 characters. */
export function visitPath(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const path = raw.split(/[?#]/)[0]?.trim() ?? "";
  if (!path.startsWith("/") || path.startsWith("//")) return null;
  return path.slice(0, 200);
}

/**
 * The site a visitor came from, by name only (google.com), or null for a direct
 * visit or one from the site itself. "www." is dropped so a site counts once.
 */
export function referrerHost(referrer: unknown, siteHost: string): string | null {
  if (typeof referrer !== "string" || !referrer.trim()) return null;
  let host: string;
  try {
    const url = new URL(referrer);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    host = url.hostname.toLowerCase();
  } catch {
    return null;
  }
  const bare = (h: string) => h.replace(/^www\./, "").split(":")[0] ?? "";
  if (!host || bare(host) === bare(siteHost.toLowerCase())) return null;
  return bare(host).slice(0, 120) || null;
}
