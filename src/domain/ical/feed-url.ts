/**
 * A calendar address an owner pasted, made ready to fetch: webcal:// becomes
 * https:// (as Airbnb and Google show it), and only https addresses on public
 * host names are accepted, so the server never fetches its own network.
 */
export function normalizeIcalFeedUrl(
  raw: string,
): { ok: true; url: string } | { ok: false; error: "invalid_url" | "not_https" | "private_host" } {
  const trimmed = raw.trim().replace(/^webcals?:\/\//i, "https://");
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return { ok: false, error: "invalid_url" };
  }
  if (url.protocol !== "https:") return { ok: false, error: "not_https" };
  if (url.username || url.password || url.port) return { ok: false, error: "invalid_url" };
  const host = url.hostname.toLowerCase();
  if (isPrivateHost(host)) return { ok: false, error: "private_host" };
  if (url.href.length > 2000) return { ok: false, error: "invalid_url" };
  url.hash = "";
  return { ok: true, url: url.href };
}

function isPrivateHost(host: string): boolean {
  if (!host.includes(".")) return true;
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  ) {
    return true;
  }
  // IP literals: other sites publish calendars on names, never on bare addresses.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  if (host.startsWith("[")) return true;
  return false;
}

/** A short name for a feed from its address ("Booking.com", "Airbnb", or the host). */
export function suggestIcalFeedName(url: string): string {
  let host = "";
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return "Calendar";
  }
  if (host.includes("booking.com")) return "Booking.com";
  if (host.includes("airbnb.")) return "Airbnb";
  if (host.includes("vrbo.") || host.includes("homeaway.")) return "Vrbo";
  if (host.includes("google.")) return "Google Calendar";
  return host.replace(/^www\./, "").slice(0, 60);
}
