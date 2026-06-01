/**
 * Tenant context — plan gates and module checks per request.
 * Resolved from host/DB via `bindTenantContextFromRequest()` on the server.
 */

import type {
  DeploymentMode,
  PlanId,
  ModuleId,
  CoreFeature,
  PlanConfig,
} from "@/core/config/plans";
import { getPlanConfig } from "@/core/config/plans";
import { PLATFORM_NAME } from "@/lib/platform/branding";

export interface TenantRecord {
  id: string;
  slug: string;
  displayName: string;
  planId: PlanId;
  activeModules: ModuleId[];
  mode: DeploymentMode;
  locale: "ro" | "en" | "bg";
  country: "RO" | "MD" | "BG";
  timezone: string;
  customDomain: string | null;
  status: "active" | "trial" | "suspended" | "cancelled";
  trialEndsAt: string | null;
  createdAt: string;
}

export interface TenantContext {
  tenant: TenantRecord;
  plan: PlanConfig;
  allModules: ModuleId[];
  hasFeature: (feature: CoreFeature) => boolean;
  hasModule: (module: ModuleId) => boolean;
  canAddRoom: (currentCount: number) => boolean;
  canAddProperty: (currentCount: number) => boolean;
  /** Platform branding on tenant surfaces (starter plans). */
  showBranding: boolean;
}

export function buildTenantContext(tenant: TenantRecord): TenantContext {
  const plan = getPlanConfig(tenant.planId);
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

/** Local dev only when DB/host tenant is unavailable. */
export const DEV_FALLBACK_TENANT: TenantRecord = {
  id: "00000000-0000-0000-0000-000000000001",
  slug: "__dev__",
  displayName: PLATFORM_NAME,
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

/** @deprecated Use DEV_FALLBACK_TENANT in tests. */
export const DEFAULT_TENANT = DEV_FALLBACK_TENANT;

let _currentContext: TenantContext | null = null;

export function setTenantContext(tenant: TenantRecord): TenantContext {
  _currentContext = buildTenantContext(tenant);
  return _currentContext;
}

export class TenantContextMissingError extends Error {
  constructor() {
    super(
      "Tenant context is not bound. Call bindTenantContextFromRequest() in a server layout or action."
    );
    this.name = "TenantContextMissingError";
  }
}

export function getTenantContext(): TenantContext {
  if (_currentContext) return _currentContext;
  throw new TenantContextMissingError();
}

export function resetTenantContext(): void {
  _currentContext = null;
}
