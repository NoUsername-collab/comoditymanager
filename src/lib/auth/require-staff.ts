import { cache } from "react";
import { localeRedirect as redirect } from "@/i18n/server-redirect";
import { createClient } from "@/lib/supabase/server";
import {
  type StaffRole,
} from "@/lib/auth/roles";
import {
  canStaffPermission,
  type PermissionGroupId,
} from "@/domain/settings/team-permissions";
import { pathPermissionGroup } from "@/domain/settings/team-permission-paths";
import {
  resolveStaffRole,
  tenantMemberRoleToStaffRole,
} from "@/lib/auth/tenant-staff";
import { locationAccessibleForMemberRole } from "@/lib/auth/location-unlock";
import { getRequestAdminPath } from "@/lib/auth/admin-path";
import { isMfaExemptAdminPath } from "@/lib/auth/mfa-policy";
import { resolveMfaRedirectPath } from "@/lib/auth/mfa-redirect";
import { resolveRequestTenant } from "@/lib/tenant/active";
import {
  getTenantMemberRole,
  type TenantMemberRole,
} from "@/services/tenant-members";
import { getTeamPermissions } from "@/services/pension-settings";

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

  const tenant = await resolveRequestTenant();
  let memberRole: TenantMemberRole | null = null;
  let role: StaffRole | null = null;

  if (tenant) {
    memberRole = await getTenantMemberRole(tenant.id, user.id);
    role = memberRole ? tenantMemberRoleToStaffRole(memberRole) : null;
  } else {
    role = await resolveStaffRole(user);
  }

  return { user, role, memberRole, supabase };
});

/** Shell chrome: admin flag + location unlock without extra tenant_members queries. */
export const getStaffShellAccess = cache(async () => {
  const ctx = await cachedStaffContext();
  if (!ctx.user || !ctx.role) {
    return { isAdmin: false, locationUnlocked: false };
  }
  const permissions = await getTeamPermissions();
  return {
    isAdmin: ctx.role === "admin",
    locationUnlocked: await locationAccessibleForMemberRole(
      ctx.memberRole,
      permissions,
    ),
  };
});

export async function requireStaff() {
  const ctx = await cachedStaffContext();

  if (!ctx.user) {
    throw new Error("auth.login_required");
  }

  if (!ctx.role) {
    throw new Error("auth.tenant_member_required");
  }

  const adminPath = await getRequestAdminPath();
  const onMfaExemptRoute = adminPath ? isMfaExemptAdminPath(adminPath) : false;

  if (!onMfaExemptRoute) {
    const mfaRedirect = await resolveMfaRedirectPath(ctx.supabase, {
      email: ctx.user.email,
      memberRole: ctx.memberRole,
    });
    if (mfaRedirect) {
      await redirect(mfaRedirect);
    }
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

/** Any authenticated staff (admin or operator). Owner maps to admin StaffRole. */
export async function requireAnyStaff() {
  return requireStaff();
}

/** @deprecated Misleading name — allows operator too. Prefer requireAnyStaff() or requireStaffRole(). */
export async function requireAdmin() {
  const { user } = await requireAnyStaff();
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

/** Configurare locație: owner acces direct; staff cu permisiune + unlock owner. */
export async function requireLocationAdmin() {
  const ctx = await requireStaff();
  const permissions = await getTeamPermissions();
  if (!canStaffPermission(ctx.memberRole, "location_structure", permissions)) {
    await redirect("/admin/settings?access=permission");
  }
  const accessible = await locationAccessibleForMemberRole(
    ctx.memberRole,
    permissions,
  );
  if (!accessible) {
    await redirect("/admin/settings?location=locked");
  }
  return ctx;
}

export async function requireStaffPermission(group: PermissionGroupId) {
  const ctx = await requireStaff();
  const permissions = await getTeamPermissions();
  if (!canStaffPermission(ctx.memberRole, group, permissions)) {
    throw new Error("auth.permission_forbidden");
  }
  return ctx;
}

export async function guardStaffPermissionRoute(pathname: string) {
  const ctx = await cachedStaffContext();
  if (!ctx.user || !ctx.role) return;

  const group = pathPermissionGroup(pathname);
  if (!group) return;

  const permissions = await getTeamPermissions();
  if (!canStaffPermission(ctx.memberRole, group, permissions)) {
    await redirect("/admin/settings?access=permission");
  }

  if (group === "location_structure" && ctx.memberRole !== "owner") {
    const accessible = await locationAccessibleForMemberRole(
      ctx.memberRole,
      permissions,
    );
    if (!accessible) {
      await redirect("/admin/settings?location=locked");
    }
  }
}

export async function guardOperatorRoute(pathname: string) {
  await guardStaffPermissionRoute(pathname);
}
