import { isPageSlugShape } from "@/domain/public-site/page-slug";

export type TenantDomainRoutingKind =
  | "platform_subdomain"
  | "custom_full"
  | "custom_public"
  | "custom_brand";

const PUBLIC_PATH_PREFIXES = [
  "/",
  "/calendar",
  "/confidentialitate",
  "/termeni",
] as const;

const BRAND_ONLY_PATHS = new Set(["/", "/confidentialitate", "/termeni"]);

const LOCALE_SEGMENTS = ["ro", "en", "bg"];

/**
 * One of the site's own pages (/restaurant, /en/restaurant): part of the site
 * wherever the site is served. Whether the page exists is the page's to say (404).
 */
function isSitePagePath(path: string): boolean {
  const segments = path.split("/").filter(Boolean);
  const rest = segments.length > 0 && LOCALE_SEGMENTS.includes(segments[0]!) ? segments.slice(1) : segments;
  return rest.length === 1 && isPageSlugShape(rest[0]!);
}

/** Paths allowed on custom_brand (the site: homepage, its own pages and legal). */
function isBrandOnlyPublicPath(path: string): boolean {
  if (BRAND_ONLY_PATHS.has(path) || isSitePagePath(path)) return true;
  const segments = path.split("/").filter(Boolean);
  if (segments.length === 1 && ["ro", "en", "bg"].includes(segments[0]!)) {
    return true;
  }
  if (
    segments.length === 2 &&
    ["ro", "en", "bg"].includes(segments[0]!) &&
    BRAND_ONLY_PATHS.has(`/${segments[1]}`)
  ) {
    return true;
  }
  return false;
}

function isPublicTenantPath(path: string): boolean {
  if (path === "/" || isSitePagePath(path)) return true;
  return PUBLIC_PATH_PREFIXES.some(
    (prefix) => prefix !== "/" && path.startsWith(prefix)
  );
}

/** A page of the guesthouse's public site (not staff, not the guest app). */
export function isPublicSitePath(path: string): boolean {
  return isPublicTenantPath(path) && !isStaffOnlyPath(path);
}

export function isStaffOnlyPath(path: string): boolean {
  return (
    path.startsWith("/admin") ||
    path === "/receptie" ||
    path.startsWith("/calendar/confirm/")
  );
}

export function pathAllowedOnCustomDomain(
  path: string,
  routingKind: TenantDomainRoutingKind | null | undefined
): boolean {
  if (!routingKind || routingKind === "platform_subdomain" || routingKind === "custom_full") {
    return true;
  }
  if (routingKind === "custom_brand") {
    return isBrandOnlyPublicPath(path);
  }
  if (routingKind === "custom_public") {
    return isPublicTenantPath(path) && !isStaffOnlyPath(path);
  }
  return true;
}

export function allowedCustomRoutingKindsForPlan(
  planId: string
): TenantDomainRoutingKind[] {
  if (
    planId === "professional" ||
    planId === "business" ||
    planId.startsWith("hybrid_professional") ||
    planId.startsWith("hybrid_business")
  ) {
    return ["custom_full", "custom_public", "custom_brand"];
  }
  if (planId.startsWith("hybrid_essential")) {
    return ["custom_brand", "custom_public"];
  }
  return [];
}
