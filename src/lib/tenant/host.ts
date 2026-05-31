const PLATFORM_DOMAIN =
  process.env.NEXT_PUBLIC_PLATFORM_DOMAIN?.trim() || "hospira.ro";

/** Staging project (test.hospira.ro) — used even if PLATFORM_DOMAIN env is wrong. */
export function isStagingDeployment(): boolean {
  if (PLATFORM_DOMAIN === "test.hospira.ro") return true;
  const site = process.env.NEXT_PUBLIC_SITE_URL?.toLowerCase() ?? "";
  return site.includes("test.hospira.ro");
}

function defaultPlatformDomain(): string {
  if (PLATFORM_DOMAIN && PLATFORM_DOMAIN !== "hospira.ro") {
    return PLATFORM_DOMAIN;
  }
  if (isStagingDeployment()) return "test.hospira.ro";
  return PLATFORM_DOMAIN;
}

/** Never emit tenant URLs on bare hospira.ro when this deploy is staging. */
function applyStagingTenantSuffix(platformDomain: string): string {
  if (isStagingDeployment() && platformDomain === "hospira.ro") {
    return "test.hospira.ro";
  }
  return platformDomain;
}

/** Optional extra platform hostnames (comma-separated env). */
const EXTRA_PLATFORM_HOSTS = (
  process.env.NEXT_PUBLIC_PLATFORM_HOSTS?.split(",") ?? []
)
  .map((h) => h.trim().toLowerCase())
  .filter(Boolean);

/** All platform apex hosts, longest first (test.hospira.ro before hospira.ro). */
export function getPlatformRoots(): string[] {
  const roots = new Set<string>([PLATFORM_DOMAIN, ...EXTRA_PLATFORM_HOSTS]);

  // Staging apex: when prod root is hospira.ro, test.hospira.ro is platform — not tenant slug "test"
  if (PLATFORM_DOMAIN && !PLATFORM_DOMAIN.startsWith("test.")) {
    roots.add(`test.${PLATFORM_DOMAIN}`);
  }

  return [...roots].sort((a, b) => b.length - a.length);
}

function normalizeHost(host: string): string {
  return host.replace(/^www\./, "").split(":")[0]?.trim().toLowerCase() ?? "";
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

export type ParsedTenantHost =
  | { type: "platform" }
  | { type: "tenant"; slug: string }
  | { type: "custom"; domain: string };

/** Parse hostname → tenant context (shared by proxy + server). */
export function parseTenantFromHost(hostInput: string): ParsedTenantHost {
  const host = hostInput.split(":")[0]?.trim().toLowerCase() ?? "";

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

/** Admin login on tenant subdomain, e.g. slug.test.hospira.ro/admin/login */
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

/** Admin path on tenant subdomain, e.g. slug.test.hospira.ro/admin */
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

/** Staging: redirect slug.hospira.ro → slug.test.hospira.ro */
export function stagingTenantHostCorrection(
  hostInput: string
): string | null {
  if (!isStagingDeployment()) return null;

  const host = normalizeHost(hostInput);
  if (!host.endsWith(".hospira.ro") || host.includes(".test.")) return null;
  if (isPlatformHost(host)) return null;

  const suffix = ".hospira.ro";
  const slug = host.slice(0, -suffix.length);
  if (!slug || slug.includes(".")) return null;

  return `${slug}.test.hospira.ro`;
}
