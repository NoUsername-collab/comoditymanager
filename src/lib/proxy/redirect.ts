import { NextResponse, type NextRequest } from "next/server";

/** Redirect to another path on the same host, keeping the current query and adding `params`. */
export function redirectToPath(
  request: NextRequest,
  pathname: string,
  params: Record<string, string> = {}
): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  for (const [name, value] of Object.entries(params)) {
    url.searchParams.set(name, value);
  }
  return NextResponse.redirect(url);
}
