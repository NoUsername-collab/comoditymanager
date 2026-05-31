const PLATFORM_DOMAIN =
  process.env.NEXT_PUBLIC_PLATFORM_DOMAIN?.trim() || "hospira.ro";

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

  if (host === PLATFORM_DOMAIN || host === `www.${PLATFORM_DOMAIN}`) {
    return { type: "platform" };
  }

  if (host.endsWith(`.${PLATFORM_DOMAIN}`)) {
    const slug = host.slice(0, -(PLATFORM_DOMAIN.length + 1));
    if (slug && !slug.includes(".")) {
      return { type: "tenant", slug };
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

/** Admin login URL on the tenant host (after signup). */
export function buildTenantLoginUrl(
  slug: string,
  params?: Record<string, string | undefined>
): string {
  const protocol =
    process.env.NODE_ENV === "production" ? "https" : "http";
  const port =
    process.env.NODE_ENV !== "production" && process.env.PORT
      ? `:${process.env.PORT}`
      : process.env.NODE_ENV !== "production"
        ? ":3000"
        : "";

  const host =
    process.env.NODE_ENV === "production"
      ? `${slug}.${PLATFORM_DOMAIN}`
      : `${slug}.localhost${port}`;

  const search = new URLSearchParams();
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value) search.set(key, value);
    }
  }
  const query = search.toString();
  return `${protocol}://${host}/admin/login${query ? `?${query}` : ""}`;
}

/** Admin (or other) path on tenant host — after platform login. */
export function buildTenantAdminUrl(
  slug: string,
  path = "/admin"
): string {
  const protocol =
    process.env.NODE_ENV === "production" ? "https" : "http";
  const port =
    process.env.NODE_ENV !== "production" && process.env.PORT
      ? `:${process.env.PORT}`
      : process.env.NODE_ENV !== "production"
        ? ":3000"
        : "";

  const host =
    process.env.NODE_ENV === "production"
      ? `${slug}.${PLATFORM_DOMAIN}`
      : `${slug}.localhost${port}`;

  const safePath = path.startsWith("/") ? path : `/${path}`;
  return `${protocol}://${host}${safePath}`;
}
