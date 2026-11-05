import { NextResponse, type NextRequest } from "next/server";
import { getPublicSiteConfig } from "@/services/public-site/queries";
import { resolveRequestTenant } from "@/lib/tenant/active";

/**
 * Served for /favicon.ico (see next.config rewrites), which browsers ask for on
 * their own: the guesthouse logo when it has one, the platform icon otherwise.
 */
export async function GET(request: NextRequest) {
  const tenant = await resolveRequestTenant();
  const logo = tenant ? (await getPublicSiteConfig()).chrome.logoUrl?.trim() : null;
  const target = logo || new URL("/brand/icon-192.png", request.url).toString();
  return NextResponse.redirect(target, {
    status: 302,
    headers: { "Cache-Control": "public, max-age=3600" },
  });
}
