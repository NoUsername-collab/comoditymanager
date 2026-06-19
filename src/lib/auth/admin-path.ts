import { headers } from "next/headers";
import { routing } from "@/i18n/routing";

/** Canonical MFA enrollment route (inside settings shell). */
export const MFA_SETUP_PATH = "/admin/settings/security";

export function stripLocalePrefixFromAdminPath(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  const first = segments[0];
  if (
    first &&
    routing.locales.includes(first as (typeof routing.locales)[number])
  ) {
    return `/${segments.slice(1).join("/")}` || "/";
  }
  return pathname;
}

/** Set by proxy.ts as x-admin-path for server-side MFA exempt checks. */
export async function getRequestAdminPath(): Promise<string | null> {
  const h = await headers();
  const raw = h.get("x-admin-path");
  if (!raw) return null;
  return stripLocalePrefixFromAdminPath(raw);
}
