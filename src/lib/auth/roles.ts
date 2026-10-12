
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

/** Operatorul nu configurează structura — doar o vede în Gantt/liste. */
const OPERATOR_FORBIDDEN_PATH_PREFIXES = [
  "/admin/buildings",
  "/admin/rooms",
  "/admin/settings/location",
] as const;

export function pathBlockedForOperator(pathname: string): boolean {
  return OPERATOR_FORBIDDEN_PATH_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}
