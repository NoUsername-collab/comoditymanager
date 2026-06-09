import { cache } from "react";
import { createPublicAdminClient } from "@/lib/supabase/admin";
import { resolveRequestTenant } from "@/lib/tenant/active";
import {
  getTenantMemberByEmail,
  listActiveTenantMembers,
  type TenantMemberRole,
} from "@/services/tenant-members";

/** Cont staff al pensiunii curente (din tenant_members, nu din .env global). */
export type StaffAccount = {
  memberId: string;
  email: string;
  role: TenantMemberRole;
};

const PASSWORD_MANAGEABLE_ROLES: TenantMemberRole[] = [
  "owner",
  "admin",
  "operator",
];

/**
 * @deprecated Folosește listStaffAccountsForCurrentTenant — lista veche din ADMIN_EMAIL/OPERATOR_EMAIL
 * aparține altei pensiuni în multi-tenant.
 */
export function listStaffAccounts(): StaffAccount[] {
  return [];
}

const loadStaffAccountsForCurrentTenant = cache(async (): Promise<
  StaffAccount[]
> => {
  const tenant = await resolveRequestTenant();
  if (!tenant) return [];
  return listStaffAccountsForTenant(tenant.id);
});

export async function listStaffAccountsForCurrentTenant(): Promise<
  StaffAccount[]
> {
  return loadStaffAccountsForCurrentTenant();
}

export async function listStaffAccountsForTenant(
  tenantId: string
): Promise<StaffAccount[]> {
  const members = await listActiveTenantMembers(tenantId);
  return members
    .filter((m) => PASSWORD_MANAGEABLE_ROLES.includes(m.role))
    .filter((m) => m.email?.trim())
    .map((m) => ({
      memberId: m.id,
      email: m.email.trim().toLowerCase(),
      role: m.role,
    }));
}

export async function updateStaffPasswordByEmail(
  email: string,
  newPassword: string,
  tenantId: string
): Promise<void> {
  if (!newPassword || newPassword.length < 8) {
    throw new Error("staff.password_min_8_chars");
  }

  const normalized = email.trim().toLowerCase();
  const member = await getTenantMemberByEmail(tenantId, normalized);
  if (!member?.is_active) {
    throw new Error("staff.unknown_account");
  }
  if (!PASSWORD_MANAGEABLE_ROLES.includes(member.role)) {
    throw new Error("staff.unknown_account");
  }

  const supabase = createPublicAdminClient();
  const userId = member.user_id;

  if (userId) {
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      password: newPassword,
    });
    if (error) throw new Error(error.message);
    return;
  }

  const { data: list, error: listError } = await supabase.auth.admin.listUsers({
    perPage: 200,
  });
  if (listError) throw new Error(listError.message);

  const user = list.users.find(
    (u) => u.email?.toLowerCase() === normalized
  );
  if (!user) {
    throw new Error("staff.account_missing_in_supabase_run_setup_staff");
  }

  const { error } = await supabase.auth.admin.updateUserById(user.id, {
    password: newPassword,
  });
  if (error) throw new Error(error.message);
}
