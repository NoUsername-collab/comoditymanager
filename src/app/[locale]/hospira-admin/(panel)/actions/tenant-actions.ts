"use server";

import { runPlatformAdminAction } from "@/lib/hospira-admin/platform-action";
import {
  updateTenantPlan,
  updateTenantStatus,
  updateTenantModules,
  updateTenantBilling,
} from "@/services/platform-admin";
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

  const run = await runPlatformAdminAction(async () => {
    const result = await updateTenantPlan(tenantId, planId);
    if (!result.success) {
      throw new Error(result.error ?? "Actualizare plan eșuată.");
    }
    revalidatePath("/hospira-admin");
    revalidatePath("/hospira-admin/tenants");
    revalidatePath(`/hospira-admin/tenants/${tenantId}`);
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

  const run = await runPlatformAdminAction(async () => {
    const result = await updateTenantStatus(tenantId, status);
    if (!result.success) {
      throw new Error(result.error ?? "Actualizare status eșuată.");
    }
    revalidatePath("/hospira-admin");
    revalidatePath("/hospira-admin/tenants");
    revalidatePath(`/hospira-admin/tenants/${tenantId}`);
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

  const run = await runPlatformAdminAction(async () => {
    const result = await updateTenantBilling(tenantId, isPaying);
    if (!result.success) {
      throw new Error(result.error ?? "Actualizare billing eșuată.");
    }
    revalidatePath("/hospira-admin");
    revalidatePath("/hospira-admin/tenants");
    revalidatePath(`/hospira-admin/tenants/${tenantId}`);
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

  const run = await runPlatformAdminAction(async () => {
    const result = await updateTenantModules(tenantId, modules);
    if (!result.success) {
      throw new Error(result.error ?? "Actualizare module eșuată.");
    }
    revalidatePath(`/hospira-admin/tenants/${tenantId}`);
    return result;
  });

  if (!run.success) {
    return { success: false, error: run.error };
  }
  return toMutationResult(run.data ?? { success: true });
}
