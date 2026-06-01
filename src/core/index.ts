/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  REZOVA — Core Barrel Export                                   ║
 * ║                                                                ║
 * ║  Single import for the entire modular architecture.            ║
 * ║  import { getTenantContext, checkFeature } from "@/core";      ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

// ── Tenant ──────────────────────────────────────────────────────
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

// ── Plans & Pricing ──────────────────────────────────────────────
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

// ── Module Registry ──────────────────────────────────────────────
export {
  type ModuleDefinition,
  type AdminNavItem,
  registerModule,
  getAllModules,
  getActiveModules,
  getModuleNavItems,
  isActionAvailable,
} from "@/core/config/modules";

// ── Feature Gates ────────────────────────────────────────────────
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

// ── Data Provider ────────────────────────────────────────────────
export {
  getDataProvider,
  resetDataProvider,
} from "@/core/provider";

// ── Repository Ports ─────────────────────────────────────────────
export type {
  ID,
  ISODate,
  ISODateTime,
  QueryResult,
  MutationResult,
  IDataProvider,
  IBuildingRepository,
  IRoomRepository,
  IGuestRepository,
  IBookingRepository,
  IPensionSettingsRepository,
  IActivityLogRepository,
  IFloorRepository,
  BuildingRecord,
  RoomRecord,
  GuestRecord,
  BookingRecord,
  FloorRecord,
  PensionSettingsRecord,
  ActivityRecord,
} from "@/core/ports/repository";
