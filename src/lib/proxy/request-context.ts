import type { NextRequest } from "next/server";
import { parseTenantFromHost } from "@/lib/tenant/host";

export type DomainContext =
  | { type: "platform" }
  | { type: "tenant"; slug: string }
  | { type: "custom"; domain: string };

export function detectDomainContext(request: NextRequest): DomainContext {
  const host = request.headers.get("host")?.split(":")[0] ?? "";

  if (host === "localhost" || host === "127.0.0.1") {
    const devSlug = request.headers.get("x-tenant-slug");
    if (devSlug) return { type: "tenant", slug: devSlug };
    return { type: "platform" };
  }

  if (host.endsWith(".localhost")) {
    const slug = host.slice(0, -".localhost".length);
    if (slug && !slug.includes(".")) return { type: "tenant", slug };
  }

  const parsed = parseTenantFromHost(host);
  if (parsed.type === "platform") return { type: "platform" };
  if (parsed.type === "tenant") return { type: "tenant", slug: parsed.slug };
  return { type: "custom", domain: parsed.domain };
}

export function stripLocalePrefix(
  pathname: string,
  locales: readonly string[]
): string {
  const segments = pathname.split("/").filter(Boolean);
  const first = segments[0];
  if (first && locales.includes(first)) {
    return `/${segments.slice(1).join("/")}` || "/";
  }
  return pathname;
}

export function isLocationAdminPath(path: string): boolean {
  return (
    path === "/admin/settings/location" ||
    path.startsWith("/admin/settings/location/")
  );
}

export function requestHostFrom(request: NextRequest): string | null {
  return request.headers.get("x-forwarded-host") ?? request.headers.get("host");
}
