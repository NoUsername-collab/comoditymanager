/**
 * Turns an error caught in a settings server action into text the owner can act on.
 *
 * Services throw either a known code ("settings.pension_settings_missing") or the raw
 * database message (English, technical). Known codes map to translated text; anything
 * else is logged for us and shown as the generic message — never the raw text.
 */

const AUTH_CODES = new Set([
  "auth.permission_forbidden",
  "auth.role_forbidden",
  "auth.tenant_member_required",
]);

type Translate = (key: string) => string;

export function settingsActionErrorMessage(
  error: unknown,
  t: Translate,
  known: Record<string, string> = {},
  context = "settings action",
): string {
  const code = error instanceof Error ? error.message : "";
  if (code && Object.hasOwn(known, code)) return known[code];
  if (AUTH_CODES.has(code)) return t("roleForbidden");
  console.error(`[${context}]`, error);
  return t("genericError");
}
