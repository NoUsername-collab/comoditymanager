/**
 * The request headers a middleware response asks Next to pass on to the page.
 * `NextResponse.next({ request: { headers } })` encodes them on the response
 * as `x-middleware-override-headers` (the names) and `x-middleware-request-<name>`
 * (the values); a response rebuilt from scratch loses them unless they are
 * carried over. next-intl passes the page's language this way.
 */
export function requestHeaderOverrides(response: Headers): [string, string][] {
  const names = response.get("x-middleware-override-headers");
  if (!names) return [];
  return names
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean)
    .flatMap((name): [string, string][] => {
      const value = response.get(`x-middleware-request-${name}`);
      return value == null ? [] : [[name, value]];
    });
}

/** `base` with the overrides of `response` laid over it; `base` is not changed. */
export function withRequestHeaderOverrides(base: Headers, response: Headers): Headers {
  const merged = new Headers(base);
  for (const [name, value] of requestHeaderOverrides(response)) merged.set(name, value);
  return merged;
}
