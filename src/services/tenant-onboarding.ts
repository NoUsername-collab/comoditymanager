import { cache } from "react";
import { breakdownTenantModules } from "@/core/config/plan-catalog";
import { getPlanConfig, resolvePlanId, type PlanId } from "@/core/config/plans";
import {
  buildTenantOnboardingChecklist,
  type TenantOnboardingChecklist,
} from "@/domain/platform-admin/tenant-onboarding";
import { getPlatformTenantById } from "@/services/platform-admin";
import { getTenantEmailOperatorSnapshot } from "@/services/tenant-email-delivery";
import { listTenantDomains } from "@/services/tenant-domains";

export const getTenantOnboardingChecklist = cache(
  async (tenantId: string): Promise<TenantOnboardingChecklist | null> => {
    const [tenant, emailSnapshot, domains] = await Promise.all([
      getPlatformTenantById(tenantId),
      getTenantEmailOperatorSnapshot(tenantId),
      listTenantDomains(tenantId).catch(() => []),
    ]);

    if (!tenant) return null;

    const planId = resolvePlanId(tenant.plan_id) as PlanId;
    const modules = breakdownTenantModules(planId, tenant.active_modules ?? []);
    const modulesSynced = modules.includedInPlan.every((m) =>
      modules.effective.includes(m),
    );

    const statusOk = tenant.status === "active" || tenant.status === "trial";
    const emailReady = emailSnapshot?.sendResolution.canSend === true;

    return buildTenantOnboardingChecklist([
      {
        id: "status_ok",
        ok: statusOk,
        required: true,
      },
      {
        id: "owner_email",
        ok: Boolean(tenant.owner_email?.trim()),
        required: true,
      },
      {
        id: "has_rooms",
        ok: tenant.room_count > 0,
        required: true,
      },
      {
        id: "has_members",
        ok: tenant.member_count > 0,
        required: true,
      },
      {
        id: "email_ready",
        ok: emailReady,
        required: true,
      },
      {
        id: "domain_configured",
        ok: domains.length > 0,
        required: true,
      },
      {
        id: "plan_modules",
        ok: modulesSynced,
        required: false,
      },
    ]);
  },
);

export async function isTenantOnboardingIncomplete(
  tenantId: string,
): Promise<boolean> {
  const checklist = await getTenantOnboardingChecklist(tenantId);
  return checklist ? !checklist.isGoLiveReady : true;
}
