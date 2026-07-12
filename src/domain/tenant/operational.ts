export type TenantLifecycleStatus =
  | "active"
  | "trial"
  | "suspended"
  | "cancelled";

const OPERATIONAL: ReadonlySet<TenantLifecycleStatus> = new Set([
  "active",
  "trial",
]);

export function normalizeTenantLifecycleStatus(
  status: string | null | undefined
): TenantLifecycleStatus {
  if (
    status === "trial" ||
    status === "suspended" ||
    status === "cancelled"
  ) {
    return status;
  }
  return "active";
}

export function isTenantOperational(
  status: string | null | undefined
): boolean {
  return OPERATIONAL.has(normalizeTenantLifecycleStatus(status));
}

export function isTenantBlocked(
  status: string | null | undefined
): boolean {
  return !isTenantOperational(status);
}
