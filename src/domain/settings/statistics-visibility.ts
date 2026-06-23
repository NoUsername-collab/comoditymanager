import type { TenantMemberRole } from "@/domain/tenant/types";

export type StatisticsVisibility = "owner" | "admin" | "all";

export const DEFAULT_STATISTICS_VISIBILITY: StatisticsVisibility = "owner";

export function parseStatisticsVisibility(
  raw: unknown
): StatisticsVisibility {
  if (raw === "admin" || raw === "all") return raw;
  return DEFAULT_STATISTICS_VISIBILITY;
}

/** Proprietarul vede mereu statisticile; restul depinde de setarea pensiunii. */
export function canAccessStatistics(
  memberRole: TenantMemberRole | null,
  visibility: StatisticsVisibility
): boolean {
  if (!memberRole) return false;
  if (memberRole === "owner") return true;
  if (visibility === "owner") return false;
  if (visibility === "admin") return memberRole === "admin";
  return memberRole === "admin" || memberRole === "operator";
}
