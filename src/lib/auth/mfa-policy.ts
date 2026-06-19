import { MFA_SETUP_PATH } from "@/lib/auth/admin-path";
import { isPlatformAdminEmail } from "@/lib/auth/require-platform-admin";
import type { TenantMemberRole } from "@/services/tenant-members";

export { MFA_SETUP_PATH };

/** Paths reachable before MFA enrollment or AAL2 step-up. */
export const MFA_EXEMPT_ADMIN_PATHS = [
  "/admin/login",
  "/admin/security/mfa",
  MFA_SETUP_PATH,
] as const;

export function isMfaExemptAdminPath(path: string): boolean {
  const normalized = path.replace(/\/$/, "") || "/";
  return MFA_EXEMPT_ADMIN_PATHS.some(
    (exempt) => normalized === exempt || normalized.startsWith(`${exempt}/`)
  );
}

/** 2FA is optional by default — app stays usable without enrollment. */
export function isMfaMandatoryForUser(_opts: {
  email?: string | null;
  memberRole?: TenantMemberRole | null;
}): boolean {
  return false;
}

/** Show the post-signup security reminder (not a login block). */
export function isMfaRecommendedForUser(opts: {
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
