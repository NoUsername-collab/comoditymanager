import {
  type CloudPlan,
  type PlanConfig,
  PLAN_CONFIGS,
} from "@/core/config/plans";

/** Cloud plans shown on nestio.ro landing & pricing. */
export const CLOUD_PLAN_ORDER: CloudPlan[] = [
  "free",
  "essential",
  "professional",
  "business",
];

export function getCloudMarketingPlans(): PlanConfig[] {
  return CLOUD_PLAN_ORDER.map((id) => PLAN_CONFIGS[id]);
}

export function formatPlanRoomLimit(maxRooms: number, unlimitedLabel: string): string {
  if (!Number.isFinite(maxRooms)) return unlimitedLabel;
  return String(maxRooms);
}
