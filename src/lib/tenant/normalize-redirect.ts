import { isValidTenantSlug } from "@/lib/tenant/routing";

/** Fix tenant redirect when staging signup returns a broken subdomain host. */
export function normalizeTenantRedirectUrl(url: string): string {
  if (typeof window === "undefined") return url;

  const host = window.location.hostname.toLowerCase();
  if (host !== "test.hospira.ro" && !host.endsWith(".test.hospira.ro")) {
    return url;
  }

  try {
    const parsed = new URL(url);

    // Already on platform host with tenant param
    if (parsed.hostname === "test.hospira.ro" && parsed.searchParams.get("tenant")) {
      return url;
    }

    let slug: string | null = null;

    if (parsed.hostname.endsWith(".test.hospira.ro")) {
      slug = parsed.hostname.slice(0, -".test.hospira.ro".length);
    } else if (parsed.hostname.endsWith(".hospira.ro")) {
      slug = parsed.hostname.slice(0, -".hospira.ro".length);
    }

    if (!isValidTenantSlug(slug)) return url;

    parsed.hostname = "test.hospira.ro";
    parsed.searchParams.set("tenant", slug);
    return parsed.toString();
  } catch {
    return url;
  }
}
