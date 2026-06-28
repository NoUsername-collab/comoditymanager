import { PLATFORM_CONTACT_EMAIL } from "@/lib/platform/branding";

/** Utilizatori staff — mapare username → email Supabase (conturi separate). */
export const OPERATOR_LOGIN_USERNAME = "Operator";
export const ADMIN_LOGIN_USERNAME = "Admin";

export type StaffLoginUsername =
  | typeof OPERATOR_LOGIN_USERNAME
  | typeof ADMIN_LOGIN_USERNAME;

export function getAdminEmail(): string {
  return process.env.ADMIN_EMAIL?.trim().toLowerCase() ?? "admin@zalmox.app";
}

export function getOperatorEmail(): string {
  return (
    process.env.OPERATOR_EMAIL?.trim().toLowerCase() ?? "operator@zalmox.app"
  );
}

/** Platform contact shown in UI — not used for staff auth. */
export { PLATFORM_CONTACT_EMAIL };

export function normalizeLoginUsername(input: string): string {
  return input.trim();
}

export function isKnownStaffUsername(input: string): boolean {
  const u = normalizeLoginUsername(input).toLowerCase();
  return (
    u === OPERATOR_LOGIN_USERNAME.toLowerCase() ||
    u === ADMIN_LOGIN_USERNAME.toLowerCase()
  );
}

export function resolveStaffEmail(username: string): string | null {
  const u = normalizeLoginUsername(username).toLowerCase();
  if (u === OPERATOR_LOGIN_USERNAME.toLowerCase()) return getOperatorEmail();
  if (u === ADMIN_LOGIN_USERNAME.toLowerCase()) return getAdminEmail();
  return null;
}

/** Username (Admin/Operator) or full email for tenant staff login. */
export function resolveLoginIdentifier(input: string): string | null {
  const trimmed = normalizeLoginUsername(input);
  if (trimmed.includes("@")) return trimmed.toLowerCase();
  return resolveStaffEmail(trimmed);
}

export function isValidLoginIdentifier(input: string): boolean {
  const trimmed = normalizeLoginUsername(input);
  if (trimmed.includes("@")) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
  }
  return isKnownStaffUsername(trimmed);
}

/** @deprecated folosește resolveStaffEmail */
export function isAdminUsername(input: string): boolean {
  return isKnownStaffUsername(input);
}
