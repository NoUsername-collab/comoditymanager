/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  REZOVA — Tenant Members Service                               ║
 * ║                                                                ║
 * ║  CRUD for staff accounts within a tenant.                      ║
 * ║  Owner can invite admin/operator, manage roles, deactivate.    ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import { createPublicAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";

// ─── Types ─────────────────────────────────────────────────────────
export type TenantMemberRole = "owner" | "admin" | "operator";

export type TenantMember = {
  id: string;
  tenant_id: string;
  user_id: string;
  email: string;
  role: TenantMemberRole;
  is_active: boolean;
  invited_at: string;
  accepted_at: string | null;
  created_at: string;
};

export type InviteMemberInput = {
  tenantId: string;
  email: string;
  role: TenantMemberRole;
  invitedByUserId: string;
};

// ─── List all members of a tenant ──────────────────────────────────
export async function listTenantMembers(
  tenantId: string
): Promise<TenantMember[]> {
  const supabase = createPublicAdminClient();
  const { data, error } = await supabase
    .from("tenant_members")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("role", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as TenantMember[];
}

// ─── List only active members ──────────────────────────────────────
export async function listActiveTenantMembers(
  tenantId: string
): Promise<TenantMember[]> {
  const members = await listTenantMembers(tenantId);
  return members.filter((m) => m.is_active);
}

// ─── Get a member by email within a tenant ─────────────────────────
export async function getTenantMemberByEmail(
  tenantId: string,
  email: string
): Promise<TenantMember | null> {
  const supabase = createPublicAdminClient();
  const { data, error } = await supabase
    .from("tenant_members")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("email", email.toLowerCase().trim())
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as TenantMember | null;
}

// ─── Get a member's role by user_id ────────────────────────────────
export async function getTenantMemberRole(
  tenantId: string,
  userId: string
): Promise<TenantMemberRole | null> {
  const supabase = createPublicAdminClient();
  const { data, error } = await supabase
    .from("tenant_members")
    .select("role, is_active")
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;
  if (!data.is_active) return null;
  return data.role as TenantMemberRole;
}

// ─── Invite a new staff member ─────────────────────────────────────
export async function inviteTenantMember(
  input: InviteMemberInput
): Promise<TenantMember> {
  const supabase = createPublicAdminClient();
  const email = input.email.toLowerCase().trim();

  // Check: can't have 2 owners
  if (input.role === "owner") {
    const existing = await listTenantMembers(input.tenantId);
    const existingOwner = existing.find(
      (m) => m.role === "owner" && m.is_active
    );
    if (existingOwner) {
      throw new Error("tenant.already_has_owner");
    }
  }

  // Check: member not already in tenant
  const existingMember = await getTenantMemberByEmail(
    input.tenantId,
    email
  );
  if (existingMember?.is_active) {
    throw new Error("tenant.member_already_exists");
  }

  // If member was previously deactivated, reactivate with new role
  if (existingMember && !existingMember.is_active) {
    const { data, error } = await supabase
      .from("tenant_members")
      .update({
        role: input.role,
        is_active: true,
        invited_at: new Date().toISOString(),
        accepted_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingMember.id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as TenantMember;
  }

  // Create Supabase Auth user if not exists
  // First check if user exists
  const { data: existingUsers } = await supabase.auth.admin.listUsers({
    perPage: 1000,
  });
  let userId = existingUsers?.users.find(
    (u) => u.email?.toLowerCase() === email
  )?.id;

  if (!userId) {
    // Create new user with a temporary password
    // Owner will need to send them a password reset link
    const tempPassword = generateTempPassword();
    const { data: newUser, error: createError } =
      await supabase.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        app_metadata: { role: input.role },
      });

    if (createError) throw new Error(createError.message);
    userId = newUser.user.id;
  } else {
    // User exists in Auth — update their app_metadata with role
    await supabase.auth.admin.updateUserById(userId, {
      app_metadata: { role: input.role },
    });
  }

  // Insert into tenant_members
  const { data, error } = await supabase
    .from("tenant_members")
    .insert({
      tenant_id: input.tenantId,
      user_id: userId,
      email,
      role: input.role,
      is_active: true,
      invited_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as TenantMember;
}

// ─── Update member role ────────────────────────────────────────────
export async function updateTenantMemberRole(
  tenantId: string,
  memberId: string,
  newRole: TenantMemberRole
): Promise<void> {
  const supabase = createPublicAdminClient();

  // Can't change to owner if one already exists
  if (newRole === "owner") {
    const members = await listTenantMembers(tenantId);
    const existingOwner = members.find(
      (m) => m.role === "owner" && m.is_active && m.id !== memberId
    );
    if (existingOwner) {
      throw new Error("tenant.already_has_owner");
    }
  }

  // Can't demote the last owner
  const member = await getTenantMemberById(memberId);
  if (member?.role === "owner" && newRole !== "owner") {
    const members = await listTenantMembers(tenantId);
    const otherOwners = members.filter(
      (m) => m.role === "owner" && m.is_active && m.id !== memberId
    );
    if (otherOwners.length === 0) {
      throw new Error("tenant.cannot_demote_last_owner");
    }
  }

  const { error } = await supabase
    .from("tenant_members")
    .update({
      role: newRole,
      updated_at: new Date().toISOString(),
    })
    .eq("id", memberId)
    .eq("tenant_id", tenantId);

  if (error) throw new Error(error.message);

  // Sync role to Supabase Auth app_metadata
  if (member?.user_id) {
    await supabase.auth.admin
      .updateUserById(member.user_id, {
        app_metadata: { role: newRole },
      })
      .catch(() => {});
  }
}

// ─── Deactivate member (soft delete) ──────────────────────────────
export async function deactivateTenantMember(
  tenantId: string,
  memberId: string
): Promise<void> {
  const supabase = createPublicAdminClient();

  // Can't deactivate the owner
  const member = await getTenantMemberById(memberId);
  if (member?.role === "owner") {
    throw new Error("tenant.cannot_deactivate_owner");
  }

  const { error } = await supabase
    .from("tenant_members")
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", memberId)
    .eq("tenant_id", tenantId);

  if (error) throw new Error(error.message);
}

// ─── Reactivate member ────────────────────────────────────────────
export async function reactivateTenantMember(
  tenantId: string,
  memberId: string
): Promise<void> {
  const supabase = createPublicAdminClient();
  const { error } = await supabase
    .from("tenant_members")
    .update({
      is_active: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", memberId)
    .eq("tenant_id", tenantId);

  if (error) throw new Error(error.message);
}

// ─── Get member by ID ──────────────────────────────────────────────
async function getTenantMemberById(
  memberId: string
): Promise<TenantMember | null> {
  const supabase = createPublicAdminClient();
  const { data, error } = await supabase
    .from("tenant_members")
    .select("*")
    .eq("id", memberId)
    .maybeSingle();

  if (error) return null;
  return data as TenantMember | null;
}

// ─── Count active members ──────────────────────────────────────────
export async function countActiveTenantMembers(
  tenantId: string
): Promise<number> {
  const supabase = createPublicAdminClient();
  const { count, error } = await supabase
    .from("tenant_members")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("is_active", true);

  if (error) return 0;
  return count ?? 0;
}

/** Platform login redirect: relink Auth ↔ tenant in DB, then return primary slug. */
export async function getPrimaryTenantSlugForUser(
  supabase: SupabaseClient,
  userId: string,
  email?: string | null
): Promise<string | null> {
  const { data: slug, error } = await supabase.rpc("prepare_platform_session");

  if (!error && typeof slug === "string" && slug.length > 0) {
    return slug;
  }

  if (error) {
    console.error(
      "[tenant-members] prepare_platform_session:",
      error.message,
      "— using service-role fallback (run migration 038 on Supabase)"
    );
  }

  return resolvePrimaryTenantSlugAdmin(userId, email);
}

/** Works without RPC 038; relinks by email when Auth UUID diverged. */
async function resolvePrimaryTenantSlugAdmin(
  userId: string,
  email?: string | null
): Promise<string | null> {
  const admin = createPublicAdminClient();
  const normalized = email?.toLowerCase().trim();

  const roleOrder: Record<string, number> = {
    owner: 0,
    admin: 1,
    operator: 2,
  };

  const pickSlug = (
    rows: Array<{
      role: string;
      tenants: { slug: string } | { slug: string }[] | null;
    }>
  ): string | null => {
    const sorted = [...rows].sort(
      (a, b) =>
        (roleOrder[String(a.role)] ?? 9) - (roleOrder[String(b.role)] ?? 9)
    );
    for (const row of sorted) {
      const nested = row.tenants;
      if (!nested) continue;
      const rowSlug = Array.isArray(nested) ? nested[0]?.slug : nested.slug;
      if (rowSlug) return rowSlug;
    }
    return null;
  };

  // 1) Prefer lookup by email — fixes “pension exists but wrong user_id”
  if (normalized) {
    const { data: byEmail, error: emailError } = await admin
      .from("tenant_members")
      .select("role, user_id, tenants(slug)")
      .eq("email", normalized)
      .eq("is_active", true);

    if (!emailError && byEmail?.length) {
      const needsRelink = byEmail.some((row) => row.user_id !== userId);
      if (needsRelink) {
        await admin
          .from("tenant_members")
          .update({ user_id: userId })
          .eq("email", normalized)
          .eq("is_active", true);
        await admin
          .from("tenants")
          .update({ owner_id: userId })
          .ilike("owner_email", normalized);
      }
      const slug = pickSlug(byEmail);
      if (slug) return slug;
    }
  }

  // 2) By auth user id
  const { data, error: adminError } = await admin
    .from("tenant_members")
    .select("role, tenants(slug)")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (adminError || !data?.length) return null;

  return pickSlug(data);
}

// ─── Helpers ───────────────────────────────────────────────────────
function generateTempPassword(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%";
  let password = "";
  for (let i = 0; i < 16; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}
