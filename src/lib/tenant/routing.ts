export const TENANT_SLUG_COOKIE = "hospira-tenant-slug";

const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/;

export function isValidTenantSlug(
  slug: string | null | undefined
): slug is string {
  return !!slug && SLUG_RE.test(slug);
}

function requestHostname(requestHost?: string | null): string {
  return (
    requestHost?.split(":")[0]?.trim().toLowerCase().replace(/^www\./, "") ??
    ""
  );
}

/** Staging uses platform host when wildcard subdomains are not on Vercel yet. */
export function usesPlatformTenantRouting(
  requestHost?: string | null
): boolean {
  const explicit = process.env.NEXT_PUBLIC_TENANT_ROUTING?.trim().toLowerCase();
  if (explicit === "platform") return true;
  if (explicit === "subdomain") return false;

  const host = requestHostname(requestHost);
  const configuredPlatform =
    process.env.NEXT_PUBLIC_PLATFORM_DOMAIN?.trim().toLowerCase() ??
    "hospira.ro";

  if (host === "test.hospira.ro") return true;
  if (configuredPlatform === "test.hospira.ro" && !host) return true;
  if (host === configuredPlatform && configuredPlatform === "test.hospira.ro") {
    return true;
  }

  return false;
}

export function tenantSlugFromPlatformRequest(request: {
  cookies: { get: (name: string) => { value: string } | undefined };
  nextUrl: { searchParams: URLSearchParams };
}): string | undefined {
  const fromQuery = request.nextUrl.searchParams.get("tenant");
  if (isValidTenantSlug(fromQuery)) return fromQuery;

  const fromCookie = request.cookies.get(TENANT_SLUG_COOKIE)?.value;
  if (isValidTenantSlug(fromCookie)) return fromCookie;

  return undefined;
}
