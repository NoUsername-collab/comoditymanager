"use server";

import { revalidatePath } from "next/cache";
import { requireStaffRole } from "@/lib/auth/require-staff";
import { getTranslations } from "next-intl/server";
import { getTenantScope } from "@/lib/tenant/scope";
import {
  inviteTenantMember,
  updateTenantMemberRole,
  deactivateTenantMember,
  reactivateTenantMember,
  listActiveTenantMembers,
  type TenantMemberRole,
} from "@/services/tenant-members";
import { logAdminActivityFromSession } from "@/services/activity-log";

type ActionResult =
  | { ok: true }
  | { ok: false; error: string };

/** Only owner and admin can manage staff */
async function requireStaffManager() {
  const ctx = await requireStaffRole(["admin"]);
  const { tenantId } = await getTenantScope();
  return { ...ctx, tenant: { id: tenantId } };
}

// ─── List staff ────────────────────────────────────────────────────
export async function listStaffAction() {
  const { tenant } = await requireStaffManager();
  const members = await listActiveTenantMembers(tenant.id);
  return { ok: true as const, members };
}

// ─── Invite new staff member ──────────────────────────────────────
export async function inviteStaffAction(
  formData: FormData
): Promise<ActionResult> {
  const t = await getTranslations("admin.serverActions");

  try {
    const { tenant, user } = await requireStaffManager();

    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const role = String(formData.get("role") ?? "operator") as TenantMemberRole;

    if (!email) {
      return { ok: false, error: t("emailRequired") };
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { ok: false, error: t("invalidEmail") };
    }

    // Only valid roles
    if (!["admin", "operator"].includes(role)) {
      return { ok: false, error: t("invalidRole") };
    }

    const member = await inviteTenantMember({
      tenantId: tenant.id,
      email,
      role,
      invitedByUserId: user.id,
    });

    await logAdminActivityFromSession({
      action: "staff.invited",
      entityType: "staff",
      entityId: member.id,
      summary: `Staff invitat: ${email} (${role})`,
      metadata: { email, role },
    });

    revalidatePath("/admin/settings/staff");
    revalidatePath("/admin/settings");
    return { ok: true };
  } catch (e) {
    if (e instanceof Error) {
      if (e.message === "tenant.member_already_exists") {
        return { ok: false, error: t("memberAlreadyExists") };
      }
      if (e.message === "tenant.already_has_owner") {
        return { ok: false, error: t("alreadyHasOwner") };
      }
    }
    return {
      ok: false,
      error: e instanceof Error ? e.message : t("genericError"),
    };
  }
}

// ─── Change staff role ─────────────────────────────────────────────
export async function changeStaffRoleAction(
  formData: FormData
): Promise<ActionResult> {
  const t = await getTranslations("admin.serverActions");

  try {
    const { tenant } = await requireStaffManager();

    const memberId = String(formData.get("member_id") ?? "");
    const newRole = String(formData.get("role") ?? "") as TenantMemberRole;

    if (!memberId) return { ok: false, error: t("memberIdRequired") };
    if (!["admin", "operator"].includes(newRole)) {
      return { ok: false, error: t("invalidRole") };
    }

    await updateTenantMemberRole(tenant.id, memberId, newRole);

    await logAdminActivityFromSession({
      action: "staff.role_changed",
      entityType: "staff",
      entityId: memberId,
      summary: `Rol schimbat → ${newRole}`,
      metadata: { memberId, newRole },
    });

    revalidatePath("/admin/settings/staff");
    return { ok: true };
  } catch (e) {
    if (e instanceof Error) {
      if (e.message === "tenant.cannot_demote_last_owner") {
        return { ok: false, error: t("cannotDemoteLastOwner") };
      }
    }
    return {
      ok: false,
      error: e instanceof Error ? e.message : t("genericError"),
    };
  }
}

// ─── Deactivate staff ──────────────────────────────────────────────
export async function deactivateStaffAction(
  formData: FormData
): Promise<ActionResult> {
  const t = await getTranslations("admin.serverActions");

  try {
    const { tenant } = await requireStaffManager();

    const memberId = String(formData.get("member_id") ?? "");
    if (!memberId) return { ok: false, error: t("memberIdRequired") };

    await deactivateTenantMember(tenant.id, memberId);

    await logAdminActivityFromSession({
      action: "staff.deactivated",
      entityType: "staff",
      entityId: memberId,
      summary: `Staff dezactivat`,
      metadata: { memberId },
    });

    revalidatePath("/admin/settings/staff");
    return { ok: true };
  } catch (e) {
    if (e instanceof Error) {
      if (e.message === "tenant.cannot_deactivate_owner") {
        return { ok: false, error: t("cannotDeactivateOwner") };
      }
    }
    return {
      ok: false,
      error: e instanceof Error ? e.message : t("genericError"),
    };
  }
}

// ─── Reactivate staff ──────────────────────────────────────────────
export async function reactivateStaffAction(
  formData: FormData
): Promise<ActionResult> {
  const t = await getTranslations("admin.serverActions");

  try {
    const { tenant } = await requireStaffManager();

    const memberId = String(formData.get("member_id") ?? "");
    if (!memberId) return { ok: false, error: t("memberIdRequired") };

    await reactivateTenantMember(tenant.id, memberId);

    await logAdminActivityFromSession({
      action: "staff.reactivated",
      entityType: "staff",
      entityId: memberId,
      summary: `Staff reactivat`,
      metadata: { memberId },
    });

    revalidatePath("/admin/settings/staff");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : t("genericError"),
    };
  }
}
