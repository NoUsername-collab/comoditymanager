"use server";

import { requirePlatformAdmin } from "@/lib/auth/require-platform-admin";
import {
  updateTenantPlan,
  updateTenantStatus,
  updateTenantModules,
} from "@/services/platform-admin";
import type { PlanId } from "@/core/config/plans";
import { revalidatePath } from "next/cache";

export async function changeTenantPlanAction(tenantId: string, planId: PlanId) {
  await requirePlatformAdmin();
  const result = await updateTenantPlan(tenantId, planId);
  if (result.success) {
    revalidatePath("/hospira-admin");
    revalidatePath(`/hospira-admin/tenants/${tenantId}`);
  }
  return result;
}

export async function changeTenantStatusAction(
  tenantId: string,
  status: "active" | "trial" | "suspended" | "cancelled"
) {
  await requirePlatformAdmin();
  const result = await updateTenantStatus(tenantId, status);
  if (result.success) {
    revalidatePath("/hospira-admin");
    revalidatePath(`/hospira-admin/tenants/${tenantId}`);
  }
  return result;
}

export async function changeTenantModulesAction(
  tenantId: string,
  modules: string[]
) {
  await requirePlatformAdmin();
  const result = await updateTenantModules(tenantId, modules);
  if (result.success) {
    revalidatePath(`/hospira-admin/tenants/${tenantId}`);
  }
  return result;
}
