import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { isLikelyBot, referrerHost, visitPath } from "@/domain/public-site/visits";
import { resolveRequestTenant } from "@/lib/tenant/active";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getPublicSiteConfig } from "@/services/public-site/queries";
import { recordPublicSiteVisit } from "@/services/public-site/visits";

/**
 * One page view of a guesthouse's public site, sent by the page itself. No
 * cookie is read or set; staff signed in to the admin and robots are not
 * counted, nor is a site that is not published yet.
 */
export async function POST(request: Request) {
  const h = await headers();
  const userAgent = h.get("user-agent");
  if (isLikelyBot(userAgent)) return new NextResponse(null, { status: 204 });

  // Staff looking at their own site are not visitors.
  const cookie = h.get("cookie") ?? "";
  if (/(?:^|;\s*)sb-[^=]+-auth-token/.test(cookie)) return new NextResponse(null, { status: 204 });

  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  const rl = await enforceRateLimit(`site-visit:${ip}`, 60, 60_000);
  if (!rl.allowed) return new NextResponse(null, { status: 429 });

  let body: { path?: unknown; referrer?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  const path = visitPath(body.path);
  if (!path) return new NextResponse(null, { status: 400 });

  const tenant = await resolveRequestTenant();
  if (!tenant) return new NextResponse(null, { status: 404 });
  const config = await getPublicSiteConfig();
  if (!config.published) return new NextResponse(null, { status: 204 });

  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  await recordPublicSiteVisit({
    tenantId: tenant.id,
    path,
    referrerHost: referrerHost(body.referrer, host),
    client: `${ip}|${userAgent ?? ""}`,
  });
  return new NextResponse(null, { status: 204 });
}
