/** Row belongs to the active tenant scope — blocks cross-tenant ID confusion. */
export function assertRowTenant<T extends { tenant_id: string }>(
  row: T | null | undefined,
  tenantId: string,
  label: string
): T {
  if (!row) {
    throw new Error(`${label}.not_found`);
  }
  if (row.tenant_id !== tenantId) {
    throw new Error("tenant.forbidden_cross_tenant");
  }
  return row;
}
