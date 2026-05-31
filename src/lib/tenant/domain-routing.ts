export type TenantDomainRoutingKind =
  | "hospira_subdomain"
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

/** Paths allowed on custom_brand (homepage + legal only). */
export function isBrandOnlyPublicPath(path: string): boolean {
  if (BRAND_ONLY_PATHS.has(path)) return true;
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

export function isPublicTenantPath(path: string): boolean {
  if (path === "/") return true;
  return PUBLIC_PATH_PREFIXES.some(
    (prefix) => prefix !== "/" && path.startsWith(prefix)
  );
}

export function isStaffOnlyPath(path: string): boolean {
  return (
    path.startsWith("/admin") ||
    path === "/receptie" ||
    path.startsWith("/calendar/confirm/")
  );
}

export function customDomainRestrictsStaff(
  routingKind: TenantDomainRoutingKind | null | undefined
): boolean {
  return routingKind === "custom_public" || routingKind === "custom_brand";
}

export function pathAllowedOnCustomDomain(
  path: string,
  routingKind: TenantDomainRoutingKind | null | undefined
): boolean {
  if (!routingKind || routingKind === "hospira_subdomain" || routingKind === "custom_full") {
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
  if (planId === "business") {
    return ["custom_full", "custom_public", "custom_brand"];
  }
  if (planId === "professional" || planId.startsWith("hybrid_professional")) {
    return ["custom_full", "custom_public", "custom_brand"];
  }
  if (planId === "essential" || planId.startsWith("hybrid_essential")) {
    return ["custom_brand", "custom_public"];
  }
  return [];
}
