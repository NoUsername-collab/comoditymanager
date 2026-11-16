import { NextResponse, type NextRequest } from "next/server";
import { defaultPlatformApexHost } from "@/lib/tenant/host";

/** The platform's home page, for a host that belongs to no property. */
export function platformHomeRedirect(request: NextRequest): NextResponse {
  const url = request.nextUrl.clone();
  if (process.env.NODE_ENV === "production") {
    url.protocol = "https:";
    url.port = "";
  }
  url.hostname = defaultPlatformApexHost();
  url.pathname = "/";
  url.search = "";
  return NextResponse.redirect(url, 302);
}

/** Redirect to another path on the same host, keeping the current query and adding `params`. */
export function redirectToPath(
  request: NextRequest,
  pathname: string,
  params: Record<string, string> = {},
): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  for (const [name, value] of Object.entries(params)) {
    url.searchParams.set(name, value);
  }
  return NextResponse.redirect(url);
}
