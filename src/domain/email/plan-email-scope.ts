import type { PlanEmailScope } from "@/core/config/plans";

/**
 * Confirmation is the guest booking email. Stay covers the other messages to
 * guests. Staff is a notice to the property's own team (a new request): every
 * plan sends it, since a request nobody sees is a lost booking.
 */
export type TenantEmailKind = "confirmation" | "stay" | "staff";

export function planAllowsEmailKind(scope: PlanEmailScope, kind: TenantEmailKind): boolean {
  if (kind === "staff") return true;
  if (scope === "none") return false;
  if (scope === "confirmation") return kind === "confirmation";
  return true;
}
