import type { PlanEmailScope } from "@/core/config/plans";

/** Confirmation is the guest booking email. Stay covers the other operational messages. */
export type TenantEmailKind = "confirmation" | "stay";

export function planAllowsEmailKind(
  scope: PlanEmailScope,
  kind: TenantEmailKind,
): boolean {
  if (scope === "none") return false;
  if (scope === "confirmation") return kind === "confirmation";
  return true;
}
