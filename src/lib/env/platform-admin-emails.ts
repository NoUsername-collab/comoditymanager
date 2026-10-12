/**
 * Platform-admin allowlist (ZALMOX_ADMIN_EMAILS).
 * Edge-safe: no Zod, no Node crypto. Used by boot env, auth guards, and proxy.
 */

/** Raw comma-separated emails, or undefined when ZALMOX_ADMIN_EMAILS is not set. */
export function readPlatformAdminEmailsRaw(
  env: { [key: string]: string | undefined } = process.env
): string | undefined {
  return env.ZALMOX_ADMIN_EMAILS?.trim() || undefined;
}
