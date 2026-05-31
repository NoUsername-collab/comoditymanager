const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/;

export function isValidTenantSlug(
  slug: string | null | undefined
): slug is string {
  return !!slug && SLUG_RE.test(slug);
}
