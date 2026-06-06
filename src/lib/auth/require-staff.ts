import { cache } from "react";
import { localeRedirect as redirect } from "@/i18n/server-redirect";
import { createClient } from "@/lib/supabase/server";
import {
  pathBlockedForOperator,
  type StaffRole,
} from "@/lib/auth/roles";
import { resolveStaffRole } from "@/lib/auth/tenant-staff";
import {
  getTenantMemberRoleForRequest,
  isLocationConfigurationAccessible,
} from "@/lib/auth/location-unlock";

/**
 * Cached per-request: resolves the authenticated staff user, role,
 * and tenant member role. Calling requireStaff() 5x in one request
 * = 1 set of network calls, not 5.
 */
const cachedStaffContext = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, role: null, memberRole: null, supabase };
  }

  const role = await resolveStaffRole(user);
  const memberRole = role ? await getTenantMemberRoleForRequest(user.id) : null;

  return { user, role, memberRole, supabase };
});

export async function requireStaff() {
  const ctx = await cachedStaffContext();

  if (!ctx.user) {
    throw new Error("auth.login_required");
  }

  if (!ctx.role) {
    throw new Error("auth.tenant_member_required");
  }

  return {
    user: ctx.user,
    role: ctx.role,
    memberRole: ctx.memberRole,
    supabase: ctx.supabase,
  };
}

export async function requireStaffRole(allowed: StaffRole[]) {
  const ctx = await requireStaff();
  if (!allowed.includes(ctx.role)) {
    throw new Error("auth.role_forbidden");
  }
  return ctx;
}

/** @deprecated alias */
export async function requireAdmin() {
  const { user } = await requireStaffRole(["admin", "operator"]);
  return user;
}

export async function getStaffUser() {
  try {
    const ctx = await cachedStaffContext();
    if (!ctx.user || !ctx.role) return null;
    return ctx.user;
  } catch {
    return null;
  }
}

/** @deprecated */
export async function getAdminUser() {
  return getStaffUser();
}

/** Configurare locație: owner acces direct; staff admin după confirmare parolă owner. */
export async function requireLocationAdmin() {
  const ctx = await requireStaff();
  const accessible = await isLocationConfigurationAccessible(ctx.user.id);
  if (!accessible) {
    await redirect("/admin/settings?location=locked");
  }
  return ctx;
}

export async function guardOperatorRoute(pathname: string) {
  const user = await getStaffUser();
  if (!user) return;
  const role = await resolveStaffRole(user);
  if (role === "operator" && pathBlockedForOperator(pathname)) {
    await redirect("/admin/settings?location=forbidden");
  }
}
