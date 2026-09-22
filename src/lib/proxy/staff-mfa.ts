import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse, NextRequest } from "next/server";
import { isMfaExemptAdminPath } from "@/lib/auth/mfa-policy";
import { resolveMfaRedirectPath } from "@/lib/auth/mfa-redirect";
import { resolveStaffRoleOnTenantHost } from "@/lib/auth/tenant-staff-edge";

export async function resolveEffectiveStaffRole(
  userId: string,
  _email: string | undefined,
  slug: string | undefined,
  customDomain: string | undefined,
  sessionClient?: SupabaseClient
): Promise<"admin" | "operator" | null> {
  if (slug) {
    return resolveStaffRoleOnTenantHost(userId, { slug }, sessionClient);
  }
  if (customDomain) {
    return resolveStaffRoleOnTenantHost(
      userId,
      { customDomain },
      sessionClient
    );
  }
  return null;
}

export async function mfaRedirectIfNeeded(
  request: NextRequest,
  supabase: SupabaseClient,
  user: { id: string; email?: string | null },
  path: string,
  memberRole: "owner" | "admin" | "operator" | null
): Promise<NextResponse | null> {
  if (isMfaExemptAdminPath(path)) return null;

  const redirectPath = await resolveMfaRedirectPath(supabase, {
    email: user.email,
    memberRole,
    next: path + (request.nextUrl.search ? request.nextUrl.search : ""),
  });

  if (!redirectPath) return null;

  return NextResponse.redirect(new URL(redirectPath, request.url));
}
