import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";

/** next-intl's request header for the locale (next-intl/dist/.../shared/constants). */
const LOCALE_HEADER = "X-NEXT-INTL-LOCALE";

/** The locale an address names ("ro" when it has no prefix). */
function addressLocale(pathname: string): string {
  const first = pathname.split("/")[1] ?? "";
  return (routing.locales as readonly string[]).includes(first) ? first : routing.defaultLocale;
}

function localePrefix(locale: string): string {
  return locale === routing.defaultLocale ? "" : `/${locale}`;
}

/**
 * The platform's home page is the landing, served on "/" itself (and "/en",
 * "/bg") so search engines and shared links keep the root address. The
 * address names its language, as on the guesthouse sites; the page is served
 * from its own route without changing the address the browser shows.
 */
export function landingAtRoot(request: NextRequest): NextResponse {
  const locale = addressLocale(request.nextUrl.pathname);
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}/landing`;
  // The page reads its language from the header next-intl's middleware would set.
  const headers = new Headers(request.headers);
  headers.set(LOCALE_HEADER, locale);
  return NextResponse.rewrite(url, { request: { headers } });
}

/** The old landing address moves, for good, to the home page in its language. */
export function landingMovedToRoot(request: NextRequest): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = localePrefix(addressLocale(request.nextUrl.pathname)) || "/";
  return NextResponse.redirect(url, 308);
}
