/**
 * Platform kernel — tenant context, plans, module registry, feature gates.
 * Prefer direct imports (`@/core/tenant/context`) over this barrel for new code.
 */

export {
  type TenantRecord,
  type TenantContext,
  buildTenantContext,
  getTenantContext,
  setTenantContext,
  resetTenantContext,
  DEFAULT_TENANT,
  DEV_FALLBACK_TENANT,
  TenantContextMissingError,
} from "@/core/tenant/context";

export {
  type DeploymentMode,
  type CloudPlan,
  type LocalPlan,
  type HybridPlan,
  type PlanId,
  type ModuleId,
  type CoreFeature,
  type PlanConfig,
  type ModuleInfo,
  PLAN_CONFIGS,
  MODULE_CATALOG,
} from "@/core/config/plans";

export {
  type ModuleDefinition,
  type AdminNavItem,
  registerModule,
  getAllModules,
  getActiveModules,
  getModuleNavItems,
  isActionAvailable,
} from "@/core/config/modules";

export {
  assertFeature,
  assertModule,
  assertCanAddRoom,
  assertCanAddProperty,
  checkFeature,
  checkModule,
  getMinimumPlanForFeature,
  getMinimumPlanForModule,
  buildFeatureMap,
  type FeatureMap,
  FeatureGateError,
  ModuleGateError,
  LimitGateError,
} from "@/core/hooks/use-feature-gate";
