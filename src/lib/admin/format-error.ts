const MESSAGE_KEYS: Record<string, string> = {
  "auth.tenant_member_required": "tenantMemberRequired",
  "auth.tenant_scope_mismatch": "tenantScopeMismatch",
  "auth.login_required": "loginRequired",
  "auth.role_forbidden": "roleForbidden",
};

/** Map thrown server error codes to admin.common i18n keys. */
export function formatAdminError(
  error: unknown,
  t: (key: string) => string
): string {
  if (error instanceof Error) {
    const key = MESSAGE_KEYS[error.message];
    if (key) {
      try {
        return t(key);
      } catch {
        return error.message;
      }
    }
    return error.message;
  }
  return t("error");
}
