// Control characters (tabs, newlines, NUL…) have no place in a redirect target.
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;

/**
 * A "return to" path we can redirect to without leaving the site.
 *
 * Accepts only same-origin paths ("/admin/…"). Rejects "//host", "/\host" (browsers
 * read it as "//host"), any backslash or scheme, control characters, and paths
 * outside `prefix` when one is given.
 */
export function safeInternalPath(
  raw: string | null | undefined,
  fallback: string,
  prefix = "/",
): string {
  const path = (raw ?? "").trim();
  if (!path.startsWith("/") || path.startsWith("//")) return fallback;
  if (path.includes("\\") || path.includes("://")) return fallback;
  if (CONTROL_CHARS.test(path)) return fallback;
  if (!path.startsWith(prefix)) return fallback;
  return path;
}
