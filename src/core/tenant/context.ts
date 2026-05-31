/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  REZOVA — Tenant Context                                       ║
 * ║                                                                ║
 * ║  Every request runs within a tenant context.                   ║
 * ║  Cloud: resolved from subdomain (casaemil.rezova.ro)           ║
 * ║  Local: loaded from local config file                          ║
 * ║  Hybrid: local config + sync metadata                          ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import type {
  DeploymentMode,
  PlanId,
  ModuleId,
  CoreFeature,
  PlanConfig,
} from "@/core/config/plans";
import { PLAN_CONFIGS } from "@/core/config/plans";

// ─── Tenant Record ──────────────────────────────────────────────
export interface TenantRecord {
  /** Unique tenant identifier (UUID in cloud, local ID in local mode) */
  id: string;

  /** URL-safe slug: "casa-emil", "hotel-panoramic" */
  slug: string;

  /** Display name: "Casa Emil", "Hotel Panoramic" */
  displayName: string;

  /** Current plan */
  planId: PlanId;

  /** Extra modules purchased (add-ons beyond what plan includes) */
  activeModules: ModuleId[];

  /** Deployment mode */
  mode: DeploymentMode;

  /** Locale preference */
  locale: "ro" | "en" | "bg";

  /** Country */
  country: "RO" | "MD" | "BG";

  /** Timezone */
  timezone: string;

  /** Custom domain (if applicable) */
  customDomain: string | null;

  /** Subscription status */
  status: "active" | "trial" | "suspended" | "cancelled";

  /** Trial end date (null if not on trial) */
  trialEndsAt: string | null;

  /** Created at */
  createdAt: string;
}

// ─── Resolved Tenant Context (available at runtime) ──────────────
export interface TenantContext {
  tenant: TenantRecord;
  plan: PlanConfig;

  /** All available modules = plan included + purchased add-ons */
  allModules: ModuleId[];

  /** Quick check: does this tenant have a specific feature? */
  hasFeature: (feature: CoreFeature) => boolean;

  /** Quick check: does this tenant have a specific module? */
  hasModule: (module: ModuleId) => boolean;

  /** Quick check: can add more rooms? */
  canAddRoom: (currentCount: number) => boolean;

  /** Quick check: can add more properties? */
  canAddProperty: (currentCount: number) => boolean;

  /** Should Rezova branding be shown? */
  showBranding: boolean;
}

// ─── Build Context from Tenant Record ────────────────────────────
export function buildTenantContext(tenant: TenantRecord): TenantContext {
  const plan = PLAN_CONFIGS[tenant.planId];

  // Merge plan's included modules with purchased add-ons (deduplicate)
  const allModules = Array.from(
    new Set([...plan.includedModules, ...tenant.activeModules])
  );

  return {
    tenant,
    plan,
    allModules,

    hasFeature(feature: CoreFeature): boolean {
      return plan.coreFeatures.includes(feature);
    },

    hasModule(module: ModuleId): boolean {
      return allModules.includes(module);
    },

    canAddRoom(currentCount: number): boolean {
      return currentCount < plan.maxRooms;
    },

    canAddProperty(currentCount: number): boolean {
      return currentCount < plan.maxProperties;
    },

    showBranding: plan.showBranding,
  };
}

// ─── Default Tenant (Casa Emil — first client) ──────────────────
export const DEFAULT_TENANT: TenantRecord = {
  id: "casa-emil-001",
  slug: "casa-emil",
  displayName: "Casa Emil",
  planId: "professional",
  activeModules: [],
  mode: "cloud",
  locale: "ro",
  country: "RO",
  timezone: "Europe/Bucharest",
  customDomain: null,
  status: "active",
  trialEndsAt: null,
  createdAt: "2025-01-01T00:00:00.000Z",
};

// ─── Tenant Resolution ──────────────────────────────────────────

/** Singleton for current request's tenant context */
let _currentContext: TenantContext | null = null;

/**
 * Set the tenant context for the current request.
 * Called early in the request lifecycle (proxy/middleware).
 */
export function setTenantContext(tenant: TenantRecord): TenantContext {
  _currentContext = buildTenantContext(tenant);
  return _currentContext;
}

/**
 * Get the current tenant context.
 * Falls back to DEFAULT_TENANT if not explicitly set
 * (backward compatible with single-tenant Casa Emil setup).
 */
export function getTenantContext(): TenantContext {
  if (!_currentContext) {
    _currentContext = buildTenantContext(DEFAULT_TENANT);
  }
  return _currentContext;
}

/**
 * Reset tenant context (for testing or between requests).
 */
export function resetTenantContext(): void {
  _currentContext = null;
}
