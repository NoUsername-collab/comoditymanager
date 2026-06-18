import { isPlatformAdminEmail } from "@/lib/auth/require-platform-admin";
import type { TenantMemberRole } from "@/services/tenant-members";

/** Paths reachable before MFA enrollment or AAL2 step-up. */
export const MFA_EXEMPT_ADMIN_PATHS = [
  "/admin/login",
  "/admin/security/mfa",
  "/admin/settings/security",
] as const;

export function isMfaExemptAdminPath(path: string): boolean {
  const normalized = path.replace(/\/$/, "") || "/";
  return MFA_EXEMPT_ADMIN_PATHS.some(
    (exempt) => normalized === exempt || normalized.startsWith(`${exempt}/`)
  );
}

/**
 * Owner accounts and Hospira platform admins must enroll TOTP.
 * Other staff may enroll optionally from settings.
 */
export function isMfaMandatoryForUser(opts: {
  email?: string | null;
  memberRole?: TenantMemberRole | null;
}): boolean {
  if (opts.email && isPlatformAdminEmail(opts.email)) return true;
  return opts.memberRole === "owner";
}

export function hasVerifiedTotpFactor(
  factors: { totp?: Array<{ status?: string }> } | null | undefined
): boolean {
  return (
    factors?.totp?.some((factor) => factor.status === "verified") ?? false
  );
}
