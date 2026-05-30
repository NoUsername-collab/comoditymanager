import type { User } from "@supabase/supabase-js";
import { getAdminEmail, getOperatorEmail } from "@/lib/auth/constants";

export type StaffRole = "admin" | "operator";

/** Legacy env-based staff (localhost dev without tenant header). */
export function getLegacyStaffRoleByEmail(
  email: string | undefined
): StaffRole | null {
  if (!email) return null;
  const normalized = email.toLowerCase();
  if (normalized === getAdminEmail().toLowerCase()) return "admin";
  if (normalized === getOperatorEmail().toLowerCase()) return "operator";
  return null;
}

/** Legacy env-based staff (localhost dev without tenant header). */
export function getLegacyStaffRole(
  user: User | null | undefined
): StaffRole | null {
  if (!user?.email) return null;
  const fromEnv = getLegacyStaffRoleByEmail(user.email);
  if (fromEnv) return fromEnv;
  const meta = user.app_metadata?.role ?? user.user_metadata?.role;
  if (meta === "admin" || meta === "operator") return meta;
  return null;
}

/**
 * @deprecated Prefer async `resolveStaffRole` from `@/lib/auth/tenant-staff`.
 * Sync fallback — legacy env emails only.
 */
export function getStaffRole(user: User | null | undefined): StaffRole | null {
  return getLegacyStaffRole(user);
}

export function isAdminRole(user: User | null | undefined): boolean {
  return getStaffRole(user) === "admin";
}

export function isOperatorRole(user: User | null | undefined): boolean {
  return getStaffRole(user) === "operator";
}

/** Rute doar pentru rol admin (fără re-auth locație). */
export const ADMIN_ONLY_PATH_PREFIXES = [
  "/admin/settings/location",
] as const;

/** Operatorul nu configurează structura — doar o vede în Gantt/liste. */
export const OPERATOR_FORBIDDEN_PATH_PREFIXES = [
  "/admin/buildings",
  "/admin/rooms",
  "/admin/settings/location",
] as const;

export function pathBlockedForOperator(pathname: string): boolean {
  return OPERATOR_FORBIDDEN_PATH_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}
