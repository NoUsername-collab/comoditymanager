/** Fix tenant redirect when staging signup returns production host. */
export function normalizeTenantRedirectUrl(url: string): string {
  if (typeof window === "undefined") return url;

  const host = window.location.hostname.toLowerCase();
  if (host !== "test.hospira.ro" && !host.endsWith(".test.hospira.ro")) {
    return url;
  }

  try {
    const parsed = new URL(url);
    const parts = parsed.hostname.split(".");
    // slug.hospira.ro → slug.test.hospira.ro
    if (
      parts.length === 3 &&
      parts[1] === "hospira" &&
      parts[2] === "ro" &&
      parts[0] !== "test" &&
      parts[0] !== "www"
    ) {
      parsed.hostname = `${parts[0]}.test.hospira.ro`;
      return parsed.toString();
    }
  } catch {
    return url;
  }

  return url;
}
