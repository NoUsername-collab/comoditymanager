/** Production platform apex. Staging runs on test.{this}. */
const ZALMOX_DOMAIN = "zalmox.app";
const ZALMOX_STAGING_DOMAIN = `test.${ZALMOX_DOMAIN}`;

const PLATFORM_DOMAIN =
  process.env.NEXT_PUBLIC_PLATFORM_DOMAIN?.trim().toLowerCase() || ZALMOX_DOMAIN;

/** Staging project (test.zalmox.app) — used even if PLATFORM_DOMAIN env is wrong. */
function isStagingDeployment(): boolean {
  if (PLATFORM_DOMAIN === ZALMOX_STAGING_DOMAIN) return true;
  const site = process.env.NEXT_PUBLIC_SITE_URL?.toLowerCase() ?? "";
  return site.includes(ZALMOX_STAGING_DOMAIN);
}

/** Platform apex for redirects when a custom domain is unknown. */
export function defaultPlatformApexHost(): string {
  return defaultPlatformDomain();
}

function defaultPlatformDomain(): string {
  if (PLATFORM_DOMAIN && PLATFORM_DOMAIN !== ZALMOX_DOMAIN) {
    return PLATFORM_DOMAIN;
  }
  if (isStagingDeployment()) return ZALMOX_STAGING_DOMAIN;
  return PLATFORM_DOMAIN;
}

/** Never emit tenant URLs on bare zalmox.app when this deploy is staging. */
function applyStagingTenantSuffix(platformDomain: string): string {
  if (isStagingDeployment() && platformDomain === ZALMOX_DOMAIN) {
    return ZALMOX_STAGING_DOMAIN;
  }
  return platformDomain;
}

/** Optional extra platform hostnames (comma-separated env). */
const EXTRA_PLATFORM_HOSTS = (
  process.env.NEXT_PUBLIC_PLATFORM_HOSTS?.split(",") ?? []
)
  .map((h) => h.trim().toLowerCase())
  .filter(Boolean);

/** Always-recognized platform apex hosts. */
const CANONICAL_PLATFORM_ROOTS = [ZALMOX_DOMAIN, ZALMOX_STAGING_DOMAIN];

/** All platform apex hosts, longest first (test.zalmox.app before zalmox.app). */
function getPlatformRoots(): string[] {
  const roots = new Set<string>([
    PLATFORM_DOMAIN,
    ...EXTRA_PLATFORM_HOSTS,
    ...CANONICAL_PLATFORM_ROOTS,
  ]);

  // Staging apex: when prod root is zalmox.app, test.zalmox.app is platform — not tenant slug "test"
  if (PLATFORM_DOMAIN && !PLATFORM_DOMAIN.startsWith("test.")) {
    roots.add(`test.${PLATFORM_DOMAIN}`);
  }

  return [...roots].sort((a, b) => b.length - a.length);
}

function normalizeHost(host: string): string {
  return host.replace(/^www\./, "").split(":")[0]?.trim().toLowerCase() ?? "";
}

/** True when the request host is the platform apex (zalmox.app, test.zalmox.app, localhost, etc.). */
export function isPlatformRequestHost(hostInput: string): boolean {
  const host = normalizeHost(hostInput);
  if (!host || host === "127.0.0.1" || host === "localhost") return true;
  if (host.endsWith(".vercel.app")) return true;
  return isPlatformHost(host);
}

function isPlatformHost(host: string): boolean {
  const normalized = normalizeHost(host);
  return getPlatformRoots().some(
    (platform) =>
      normalized === platform || normalized === `www.${platform}`
  );
}

/** Platform domain for tenant URLs — derived from the signup/login request host. */
export function platformDomainFromRequestHost(
  requestHost: string | null | undefined
): string {
  const host =
    requestHost?.split(":")[0]?.trim().toLowerCase().replace(/^www\./, "") ??
    "";

  if (!host || host === "127.0.0.1") return defaultPlatformDomain();
  if (host === "localhost") return "localhost";
  if (host.endsWith(".vercel.app")) return defaultPlatformDomain();

  if (isPlatformHost(host)) return host.replace(/^www\./, "");

  const parsed = parseTenantFromHost(host);
  if (parsed.type === "platform") return host;
  if (parsed.type === "tenant") {
    return applyStagingTenantSuffix(host.slice(parsed.slug.length + 1));
  }

  return defaultPlatformDomain();
}

function tenantHost(slug: string, platformDomain: string): string {
  const port =
    process.env.NODE_ENV !== "production" && process.env.PORT
      ? `:${process.env.PORT}`
      : process.env.NODE_ENV !== "production"
        ? ":3000"
        : "";

  if (process.env.NODE_ENV !== "production") {
    if (platformDomain === "localhost") {
      return `${slug}.localhost${port}`;
    }
  }

  return `${slug}.${platformDomain}`;
}

type ParsedTenantHost =
  | { type: "platform" }
  | { type: "tenant"; slug: string }
  | { type: "custom"; domain: string };

/** Parse hostname → tenant context (shared by proxy + server). */
export function parseTenantFromHost(hostInput: string): ParsedTenantHost {
  const host = normalizeHost(hostInput);

  if (!host || host === "127.0.0.1") {
    return { type: "platform" };
  }

  if (host === "localhost") {
    return { type: "platform" };
  }

  if (host.endsWith(".localhost")) {
    const slug = host.slice(0, -".localhost".length);
    if (slug && !slug.includes(".")) {
      return { type: "tenant", slug };
    }
  }

  if (isPlatformHost(host)) {
    return { type: "platform" };
  }

  const platformRoots = getPlatformRoots();

  for (const platform of platformRoots) {
    if (host.endsWith(`.${platform}`)) {
      const slug = host.slice(0, -(platform.length + 1));
      if (slug && !slug.includes(".")) {
        return { type: "tenant", slug };
      }
    }
  }

  if (host.endsWith(".vercel.app")) {
    return { type: "platform" };
  }

  return { type: "custom", domain: host };
}

export function tenantSlugFromHost(hostInput: string): string | null {
  const parsed = parseTenantFromHost(hostInput);
  return parsed.type === "tenant" ? parsed.slug : null;
}

export function tenantDomainFromHost(hostInput: string): string | null {
  const parsed = parseTenantFromHost(hostInput);
  return parsed.type === "custom" ? parsed.domain : null;
}

/** Admin login on tenant subdomain, e.g. slug.test.zalmox.app/admin/login */
export function buildTenantLoginUrl(
  slug: string,
  params?: Record<string, string | undefined>,
  requestHost?: string | null
): string {
  const protocol =
    process.env.NODE_ENV === "production" ? "https" : "http";
  const platformDomain = applyStagingTenantSuffix(
    platformDomainFromRequestHost(requestHost)
  );
  const host = tenantHost(slug, platformDomain);

  const search = new URLSearchParams();
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value) search.set(key, value);
    }
  }
  const query = search.toString();
  return `${protocol}://${host}/admin/login${query ? `?${query}` : ""}`;
}

/** Admin path on tenant subdomain, e.g. slug.test.zalmox.app/admin */
export function buildTenantAdminUrl(
  slug: string,
  path = "/admin",
  requestHost?: string | null
): string {
  const protocol =
    process.env.NODE_ENV === "production" ? "https" : "http";
  const platformDomain = applyStagingTenantSuffix(
    platformDomainFromRequestHost(requestHost)
  );
  const host = tenantHost(slug, platformDomain);
  const safePath = path.startsWith("/") ? path : `/${path}`;
  return `${protocol}://${host}${safePath}`;
}

/** Public tenant site origin, e.g. https://slug.test.zalmox.app */
export function buildTenantSiteUrl(
  slug: string,
  requestHost?: string | null,
): string {
  const protocol =
    process.env.NODE_ENV === "production" ? "https" : "http";
  const platformDomain = applyStagingTenantSuffix(
    platformDomainFromRequestHost(requestHost),
  );
  const host = tenantHost(slug, platformDomain);
  return `${protocol}://${host}`;
}

/** Staging: redirect slug.zalmox.app → slug.test.zalmox.app. */
export function stagingTenantHostCorrection(
  hostInput: string
): string | null {
  if (!isStagingDeployment()) return null;

  const host = normalizeHost(hostInput);
  if (host.includes(".test.")) return null;
  if (isPlatformHost(host)) return null;

  const suffix = `.${ZALMOX_DOMAIN}`;
  if (!host.endsWith(suffix)) return null;
  const slug = host.slice(0, -suffix.length);
  if (!slug || slug.includes(".")) return null;
  return `${slug}.${ZALMOX_STAGING_DOMAIN}`;
}
