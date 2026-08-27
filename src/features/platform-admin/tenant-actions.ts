"use server";

import { runPlatformAdminAction } from "@/lib/platform-admin/platform-action";
import { logPlatformAdminActivity } from "@/lib/platform-admin/platform-activity-log";
import {
  updateTenantPlan,
  updateTenantStatus,
  updateTenantModules,
  updateTenantBilling,
  getTenantMutationSnapshot,
} from "@/services/platform-admin";
import {
  saveTenantResendApiKeyToVault,
  clearTenantResendApiKeyFromVault,
} from "@/services/tenant-email-secrets";
import {
  updateTenantEmailDelivery,
  getTenantEmailDelivery,
  type UpdateTenantEmailDeliveryInput,
} from "@/services/tenant-email-delivery";
import { defaultModulesForPlan } from "@/core/config/plan-catalog";
import type { PlanId } from "@/core/config/plans";
import { revalidatePath } from "next/cache";

type TenantMutationResult = { success: boolean; error?: string };

function toMutationResult(
  result: Awaited<ReturnType<typeof updateTenantPlan>>
): TenantMutationResult {
  return result.success
    ? { success: true }
    : { success: false, error: result.error ?? "Operațiunea a eșuat." };
}

export async function changeTenantPlanAction(
  tenantId: string,
  planId: PlanId
): Promise<TenantMutationResult> {
  if (!tenantId?.trim()) {
    return { success: false, error: "Tenant invalid." };
  }

  const run = await runPlatformAdminAction(async (session) => {
    const before = await getTenantMutationSnapshot(tenantId);
    const result = await updateTenantPlan(tenantId, planId);
    if (!result.success) {
      throw new Error(result.error ?? "Actualizare plan eșuată.");
    }

    await logPlatformAdminActivity({
      tenantId,
      actor: session,
      action: "platform.tenant_plan_changed",
      summary: `Plan: ${before?.plan_id ?? "?"} → ${planId}`,
      metadata: { from: before?.plan_id, to: planId },
    });

    revalidatePath("/platform-admin");
    revalidatePath("/platform-admin/tenants");
    revalidatePath(`/platform-admin/tenants/${tenantId}`);
    return result;
  });

  if (!run.success) {
    return { success: false, error: run.error };
  }
  return toMutationResult(run.data ?? { success: true });
}

export async function changeTenantStatusAction(
  tenantId: string,
  status: "active" | "trial" | "suspended" | "cancelled"
): Promise<TenantMutationResult> {
  if (!tenantId?.trim()) {
    return { success: false, error: "Tenant invalid." };
  }

  const run = await runPlatformAdminAction(async (session) => {
    const before = await getTenantMutationSnapshot(tenantId);
    const result = await updateTenantStatus(tenantId, status);
    if (!result.success) {
      throw new Error(result.error ?? "Actualizare status eșuată.");
    }

    await logPlatformAdminActivity({
      tenantId,
      actor: session,
      action: "platform.tenant_status_changed",
      summary: `Status: ${before?.status ?? "?"} → ${status}`,
      metadata: { from: before?.status, to: status },
    });

    revalidatePath("/platform-admin");
    revalidatePath("/platform-admin/tenants");
    revalidatePath(`/platform-admin/tenants/${tenantId}`);
    return result;
  });

  if (!run.success) {
    return { success: false, error: run.error };
  }
  return toMutationResult(run.data ?? { success: true });
}

export async function changeTenantBillingAction(
  tenantId: string,
  isPaying: boolean
): Promise<TenantMutationResult> {
  if (!tenantId?.trim()) {
    return { success: false, error: "Tenant invalid." };
  }

  const run = await runPlatformAdminAction(async (session) => {
    const before = await getTenantMutationSnapshot(tenantId);
    const result = await updateTenantBilling(tenantId, isPaying);
    if (!result.success) {
      throw new Error(result.error ?? "Actualizare billing eșuată.");
    }

    await logPlatformAdminActivity({
      tenantId,
      actor: session,
      action: "platform.tenant_billing_changed",
      summary: `Billing: ${before?.is_paying ? "paying" : "free"} → ${isPaying ? "paying" : "free"}`,
      metadata: { from: before?.is_paying ?? false, to: isPaying },
    });

    revalidatePath("/platform-admin");
    revalidatePath("/platform-admin/tenants");
    revalidatePath(`/platform-admin/tenants/${tenantId}`);
    return result;
  });

  if (!run.success) {
    return { success: false, error: run.error };
  }
  return toMutationResult(run.data ?? { success: true });
}

export async function changeTenantModulesAction(
  tenantId: string,
  modules: string[]
): Promise<TenantMutationResult> {
  if (!tenantId?.trim()) {
    return { success: false, error: "Tenant invalid." };
  }

  const run = await runPlatformAdminAction(async (session) => {
    const before = await getTenantMutationSnapshot(tenantId);
    const result = await updateTenantModules(tenantId, modules);
    if (!result.success) {
      throw new Error(result.error ?? "Actualizare module eșuată.");
    }

    await logPlatformAdminActivity({
      tenantId,
      actor: session,
      action: "platform.tenant_modules_changed",
      summary: "Module actualizate de platform admin",
      metadata: {
        from: before?.active_modules ?? [],
        to: modules,
      },
    });

    revalidatePath(`/platform-admin/tenants/${tenantId}`);
    return result;
  });

  if (!run.success) {
    return { success: false, error: run.error };
  }
  return toMutationResult(run.data ?? { success: true });
}

export async function changeTenantEmailDeliveryAction(
  tenantId: string,
  input: UpdateTenantEmailDeliveryInput,
): Promise<TenantMutationResult> {
  if (!tenantId?.trim()) {
    return { success: false, error: "Tenant invalid." };
  }

  const run = await runPlatformAdminAction(async (session) => {
    const before = await getTenantEmailDelivery(tenantId).catch(() => null);
    const result = await updateTenantEmailDelivery(tenantId, input);
    if (!result.success) {
      throw new Error(result.error ?? "Actualizare email delivery eșuată.");
    }

    await logPlatformAdminActivity({
      tenantId,
      actor: session,
      action: "platform.tenant_email_delivery_changed",
      summary: `Email: ${before?.deliveryMode ?? "?"} → ${input.deliveryMode}`,
      metadata: { from: before?.deliveryMode, to: input.deliveryMode },
    });

    revalidatePath(`/platform-admin/tenants/${tenantId}`);
    return result;
  });

  if (!run.success) {
    return { success: false, error: run.error };
  }
  return toMutationResult(run.data ?? { success: true });
}

export async function syncTenantPlanModulesAction(
  tenantId: string,
  planId: PlanId,
): Promise<TenantMutationResult> {
  if (!tenantId?.trim()) {
    return { success: false, error: "Tenant invalid." };
  }

  const modules = defaultModulesForPlan(planId);

  const run = await runPlatformAdminAction(async (session) => {
    const before = await getTenantMutationSnapshot(tenantId);
    const result = await updateTenantModules(tenantId, modules);
    if (!result.success) {
      throw new Error(result.error ?? "Sincronizare module eșuată.");
    }

    await logPlatformAdminActivity({
      tenantId,
      actor: session,
      action: "platform.tenant_modules_synced",
      summary: `Module sincronizate cu planul ${planId}`,
      metadata: { planId, from: before?.active_modules ?? [], to: modules },
    });

    revalidatePath(`/platform-admin/tenants/${tenantId}`);
    return result;
  });

  if (!run.success) {
    return { success: false, error: run.error };
  }
  return toMutationResult(run.data ?? { success: true });
}

export async function saveTenantResendVaultKeyAction(
  tenantId: string,
  apiKey: string,
): Promise<TenantMutationResult> {
  if (!tenantId?.trim()) {
    return { success: false, error: "Tenant invalid." };
  }

  const run = await runPlatformAdminAction(async (session) => {
    const result = await saveTenantResendApiKeyToVault(tenantId, apiKey);
    if (!result.success) {
      throw new Error(result.error ?? "Salvare cheie vault eșuată.");
    }

    await updateTenantEmailDelivery(tenantId, {
      deliveryMode: "tenant_resend",
      byokConfigured: true,
    });

    await logPlatformAdminActivity({
      tenantId,
      actor: session,
      action: "platform.tenant_resend_vault_saved",
      summary: `Resend BYOK salvat în vault (${result.hint ?? "re_…"})`,
      metadata: { hint: result.hint ?? null },
    });

    revalidatePath(`/platform-admin/tenants/${tenantId}`);
    return result;
  });

  if (!run.success) {
    return { success: false, error: run.error };
  }
  return { success: true };
}

export async function clearTenantResendVaultKeyAction(
  tenantId: string,
): Promise<TenantMutationResult> {
  if (!tenantId?.trim()) {
    return { success: false, error: "Tenant invalid." };
  }

  const run = await runPlatformAdminAction(async (session) => {
    const result = await clearTenantResendApiKeyFromVault(tenantId);
    if (!result.success) {
      throw new Error(result.error ?? "Ștergere cheie vault eșuată.");
    }

    await logPlatformAdminActivity({
      tenantId,
      actor: session,
      action: "platform.tenant_resend_vault_cleared",
      summary: "Cheie Resend BYOK ștearsă din vault",
    });

    revalidatePath(`/platform-admin/tenants/${tenantId}`);
    return result;
  });

  if (!run.success) {
    return { success: false, error: run.error };
  }
  return { success: true };
}
