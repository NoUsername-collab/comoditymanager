/**
 * Platform-admin allowlist — ZALMOX first, then legacy rebrand vars.
 * Edge-safe: no Zod, no Node crypto. Used by boot env, auth guards, and proxy.
 */

/** Raw comma-separated emails, or undefined if none of the three vars are set. */
export function readPlatformAdminEmailsRaw(
  env: { [key: string]: string | undefined } = process.env
): string | undefined {
  const raw =
    env.ZALMOX_ADMIN_EMAILS?.trim() ||
    env.HOSPIRA_ADMIN_EMAILS?.trim() ||
    env.NESTIO_ADMIN_EMAILS?.trim();
  return raw || undefined;
}
