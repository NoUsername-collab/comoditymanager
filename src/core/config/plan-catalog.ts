import {
  MODULE_CATALOG,
  PLAN_CONFIGS,
  type CloudPlan,
  type CoreFeature,
  type ModuleId,
  type PlanConfig,
  type PlanId,
} from "@/core/config/plans";

export type PlanLimitsSummary = {
  maxRooms: number;
  maxTeamMembers: number;
  maxProperties: number;
  showBranding: boolean;
  emailMonthlyCap: number | null;
};

export type PlanModuleBreakdown = {
  includedInPlan: ModuleId[];
  activeAddons: ModuleId[];
  effective: ModuleId[];
};

const CLOUD_PLAN_ORDER: CloudPlan[] = [
  "free",
  "essential",
  "professional",
  "business",
];

export function listCloudPlans(): PlanConfig[] {
  return CLOUD_PLAN_ORDER.map((id) => PLAN_CONFIGS[id]);
}

export function getPlanLimitsSummary(planId: PlanId): PlanLimitsSummary {
  const plan = PLAN_CONFIGS[planId];
  return {
    maxRooms: plan.maxRooms,
    maxTeamMembers: plan.maxTeamMembers,
    maxProperties: plan.maxProperties,
    showBranding: plan.showBranding,
    emailMonthlyCap: plan.emailMonthlyCap,
  };
}

export function breakdownTenantModules(
  planId: PlanId,
  activeModules: string[],
): PlanModuleBreakdown {
  const plan = PLAN_CONFIGS[planId];
  const included = [...plan.includedModules];
  const active = activeModules.filter((m): m is ModuleId => m in MODULE_CATALOG);
  const effective = Array.from(new Set([...included, ...active]));
  const activeAddons = active.filter((m) => !included.includes(m));
  return {
    includedInPlan: included,
    activeAddons,
    effective,
  };
}

export function planIncludesFeature(planId: PlanId, feature: CoreFeature): boolean {
  return PLAN_CONFIGS[planId].coreFeatures.includes(feature);
}

/** Modules that should be active when plan defaults are applied (plan includes only). */
export function defaultModulesForPlan(planId: PlanId): ModuleId[] {
  return [...PLAN_CONFIGS[planId].includedModules];
}
