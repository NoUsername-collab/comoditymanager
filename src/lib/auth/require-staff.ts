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

export async function requireStaff() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("auth.login_required");
  }

  const role = await resolveStaffRole(user);
  if (!role) {
    throw new Error("auth.tenant_member_required");
  }

  const memberRole = await getTenantMemberRoleForRequest(user.id);

  return { user, role, memberRole, supabase };
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
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    const role = await resolveStaffRole(user);
    if (!role) return null;
    return user;
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
