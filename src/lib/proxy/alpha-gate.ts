import { NextResponse, NextRequest } from "next/server";
import {
  ALPHA_GATE_COOKIE,
  isAlphaGateCookieFresh,
} from "@/lib/auth/alpha-gate-cookie";
import {
  isAlphaGateEnabled,
  isAlphaGateExemptPath,
} from "@/lib/auth/alpha-gate-edge";
import { routing } from "@/i18n/routing";

export function alphaGateRedirectIfNeeded(
  request: NextRequest,
  path: string
): NextResponse | null {
  if (!isAlphaGateEnabled() || isAlphaGateExemptPath(path)) return null;

  const token = request.cookies.get(ALPHA_GATE_COOKIE)?.value;
  if (isAlphaGateCookieFresh(token)) return null;

  const url = request.nextUrl.clone();
  const segments = url.pathname.split("/").filter(Boolean);
  const first = segments[0];
  const hasLocale =
    Boolean(first) &&
    routing.locales.includes(first as (typeof routing.locales)[number]);
  const localePrefix = hasLocale ? `/${first}` : "";
  const returnTo =
    request.nextUrl.pathname +
    (request.nextUrl.search ? request.nextUrl.search : "");

  url.pathname = `${localePrefix}/alpha-gate`;
  url.search = "";
  url.searchParams.set("next", returnTo);
  return NextResponse.redirect(url);
}
