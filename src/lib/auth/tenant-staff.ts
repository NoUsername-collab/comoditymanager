import type { User } from "@supabase/supabase-js";
import { isTenantOperational } from "@/domain/tenant/operational";
import { lookupRequestTenantHost, resolveRequestTenant } from "@/lib/tenant/active";
import type { StaffRole } from "@/lib/auth/roles";
import {
  getTenantMemberRole,
  type TenantMemberRole,
} from "@/services/tenant-members";

export function tenantMemberRoleToStaffRole(
  role: TenantMemberRole
): StaffRole {
  if (role === "operator") return "operator";
  return "admin";
}

/** Active tenant member role for a user (server). */
export async function getStaffRoleForTenant(
  userId: string,
  tenantId: string
): Promise<StaffRole | null> {
  const memberRole = await getTenantMemberRole(tenantId, userId);
  if (!memberRole) return null;
  return tenantMemberRoleToStaffRole(memberRole);
}

/**
 * Resolve staff role for the current request.
 * Tenant hosts → tenant_members only (no global env bypass).
 * Local dev without tenant header → legacy ADMIN_EMAIL / OPERATOR_EMAIL.
 */
export async function resolveStaffRole(
  user: User | null | undefined
): Promise<StaffRole | null> {
  if (!user?.id) return null;

  const hostTenant = await lookupRequestTenantHost();
  if (hostTenant) {
    if (!isTenantOperational(hostTenant.status)) return null;
    return getStaffRoleForTenant(user.id, hostTenant.id);
  }

  const tenant = await resolveRequestTenant();
  if (tenant) {
    return getStaffRoleForTenant(user.id, tenant.id);
  }

  // Platform apex / local dev without tenant host — metadata from signup bootstrap only.
  const metaRole = user.app_metadata?.role;
  if (metaRole === "admin" || metaRole === "operator" || metaRole === "owner") {
    return metaRole === "operator" ? "operator" : "admin";
  }

  return null;
}

/** Throws if user is not an active member on the current tenant host. */
export async function requireTenantMembership(
  user: User
): Promise<StaffRole> {
  const role = await resolveStaffRole(user);
  if (!role) {
    throw new Error("auth.tenant_member_required");
  }
  return role;
}
