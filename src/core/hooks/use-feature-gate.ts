/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  REZOVA — Feature Gate Utilities                               ║
 * ║                                                                ║
 * ║  Server-side and client-side feature/module checking.          ║
 * ║  Every gated UI element uses these helpers.                    ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import type { CoreFeature, ModuleId, PlanId } from "@/core/config/plans";
import { PLAN_CONFIGS } from "@/core/config/plans";
import { getTenantContext } from "@/core/tenant/context";
import type { TenantContext } from "@/core/tenant/context";

// ─── Server-side Guards ──────────────────────────────────────────

/**
 * Assert that the current tenant has a specific feature.
 * Throws if not available — use in server actions.
 *
 * @example
 * ```ts
 * // In a server action:
 * export async function createInvoiceAction() {
 *   assertFeature("invoicing"); // throws if plan doesn't include it
 *   // ... rest of action
 * }
 * ```
 */
export function assertFeature(feature: CoreFeature): void {
  const ctx = getTenantContext();
  if (!ctx.hasFeature(feature)) {
    throw new FeatureGateError(
      `Feature "${feature}" nu este disponibilă în planul ${ctx.plan.label}. Faceți upgrade pentru a accesa această funcționalitate.`,
      feature,
      ctx.plan.id
    );
  }
}

/**
 * Assert that the current tenant has a specific module.
 * Throws if not available — use in server actions.
 */
export function assertModule(module: ModuleId): void {
  const ctx = getTenantContext();
  if (!ctx.hasModule(module)) {
    throw new ModuleGateError(
      `Modulul "${module}" nu este activ. Activați-l din setările contului.`,
      module,
      ctx.plan.id
    );
  }
}

/**
 * Assert that the tenant can add another room.
 */
export function assertCanAddRoom(currentRoomCount: number): void {
  const ctx = getTenantContext();
  if (!ctx.canAddRoom(currentRoomCount)) {
    throw new LimitGateError(
      `Planul ${ctx.plan.label} permite maximum ${ctx.plan.maxRooms} camere. Faceți upgrade pentru mai multe.`,
      "rooms",
      ctx.plan.maxRooms,
      currentRoomCount
    );
  }
}

/**
 * Assert that the tenant can add another property.
 */
export function assertCanAddProperty(currentPropertyCount: number): void {
  const ctx = getTenantContext();
  if (!ctx.canAddProperty(currentPropertyCount)) {
    throw new LimitGateError(
      `Planul ${ctx.plan.label} permite maximum ${ctx.plan.maxProperties} proprietăți. Faceți upgrade.`,
      "properties",
      ctx.plan.maxProperties,
      currentPropertyCount
    );
  }
}

// ─── Non-throwing checks (for UI rendering) ─────────────────────

/**
 * Check feature availability without throwing.
 * Use in components to conditionally render UI.
 */
export function checkFeature(feature: CoreFeature): boolean {
  return getTenantContext().hasFeature(feature);
}

/**
 * Check module availability without throwing.
 */
export function checkModule(module: ModuleId): boolean {
  return getTenantContext().hasModule(module);
}

/**
 * Get the minimum plan required for a feature.
 * Useful for "Upgrade to X" messaging.
 */
export function getMinimumPlanForFeature(feature: CoreFeature): PlanId | null {
  const cloudPlans: PlanId[] = ["starter", "standard", "pro", "business"];
  for (const planId of cloudPlans) {
    if (PLAN_CONFIGS[planId].coreFeatures.includes(feature)) {
      return planId;
    }
  }
  return null;
}

/**
 * Get the minimum plan required for a module.
 */
export function getMinimumPlanForModule(module: ModuleId): PlanId | null {
  const cloudPlans: PlanId[] = ["starter", "standard", "pro", "business"];
  for (const planId of cloudPlans) {
    if (PLAN_CONFIGS[planId].includedModules.includes(module)) {
      return planId;
    }
  }
  // Module is available as add-on for any plan
  return null;
}

/**
 * Build a serializable feature map for client-side rendering.
 * Pass this to client components via props/context.
 */
export function buildFeatureMap(ctx?: TenantContext): FeatureMap {
  const c = ctx ?? getTenantContext();
  return {
    planId: c.plan.id,
    planLabel: c.plan.label,
    mode: c.plan.mode,
    maxRooms: c.plan.maxRooms,
    maxProperties: c.plan.maxProperties,
    showBranding: c.showBranding,
    features: Object.fromEntries(
      ([
        "calendar", "gantt", "guest_files", "bookings",
        "rooms_unlimited", "email_notifications", "themes",
        "heatmap", "priority_support", "custom_domain",
        "professional_email", "sla_guarantee", "dedicated_manager",
        "onboarding", "automations",
      ] as CoreFeature[]).map((f) => [f, c.hasFeature(f)])
    ) as Record<CoreFeature, boolean>,
    modules: Object.fromEntries(
      ([
        "ical_sync", "invoicing", "whatsapp", "public_page",
        "advanced_reports", "multi_property", "white_label", "api_access",
      ] as ModuleId[]).map((m) => [m, c.hasModule(m)])
    ) as Record<ModuleId, boolean>,
  };
}

export interface FeatureMap {
  planId: PlanId;
  planLabel: string;
  mode: string;
  maxRooms: number;
  maxProperties: number;
  showBranding: boolean;
  features: Record<CoreFeature, boolean>;
  modules: Record<ModuleId, boolean>;
}

// ─── Error Types ─────────────────────────────────────────────────

export class FeatureGateError extends Error {
  readonly code = "FEATURE_GATE";
  constructor(
    message: string,
    public readonly feature: CoreFeature,
    public readonly currentPlan: PlanId
  ) {
    super(message);
    this.name = "FeatureGateError";
  }
}

export class ModuleGateError extends Error {
  readonly code = "MODULE_GATE";
  constructor(
    message: string,
    public readonly module: ModuleId,
    public readonly currentPlan: PlanId
  ) {
    super(message);
    this.name = "ModuleGateError";
  }
}

export class LimitGateError extends Error {
  readonly code = "LIMIT_GATE";
  constructor(
    message: string,
    public readonly resource: string,
    public readonly limit: number,
    public readonly current: number
  ) {
    super(message);
    this.name = "LimitGateError";
  }
}
