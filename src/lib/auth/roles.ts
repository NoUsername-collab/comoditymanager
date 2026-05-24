import type { User } from "@supabase/supabase-js";
import { getAdminEmail, getOperatorEmail } from "@/lib/auth/constants";

export type StaffRole = "admin" | "operator";

export function getStaffRole(user: User | null | undefined): StaffRole | null {
  if (!user?.email) return null;
  const email = user.email.toLowerCase();
  if (email === getAdminEmail().toLowerCase()) return "admin";
  if (email === getOperatorEmail().toLowerCase()) return "operator";
  const meta = user.app_metadata?.role ?? user.user_metadata?.role;
  if (meta === "admin" || meta === "operator") return meta;
  return null;
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
