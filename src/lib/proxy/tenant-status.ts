import { NextResponse, NextRequest } from "next/server";
import { isTenantOperational } from "@/domain/tenant/operational";
import { lookupTenantHostOnEdge } from "@/lib/tenant/tenant-host-edge";

export const TENANT_STATUS_EXEMPT_PATHS = new Set([
  "/tenant-suspended",
  "/admin/login",
]);

export function tenantSuspendedRedirect(
  request: NextRequest,
  path: string,
  status: string
): NextResponse | null {
  if (TENANT_STATUS_EXEMPT_PATHS.has(path)) return null;
  const url = request.nextUrl.clone();
  url.pathname = "/tenant-suspended";
  url.search = "";
  url.searchParams.set("status", status);
  return NextResponse.redirect(url);
}

export async function blockedTenantRedirectIfNeeded(
  request: NextRequest,
  path: string,
  slug: string | undefined,
  customDomain: string | undefined
): Promise<NextResponse | null> {
  if (!slug && !customDomain) return null;

  const lookup = await lookupTenantHostOnEdge(
    slug ? { slug } : { customDomain: customDomain! }
  );
  if (!lookup || isTenantOperational(lookup.status)) return null;

  return tenantSuspendedRedirect(request, path, lookup.status);
}
