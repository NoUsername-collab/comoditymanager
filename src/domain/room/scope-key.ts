/** Cheie stabilă pentru scope clădire + etaj (formular, validare duplicate). */
export function roomScopeKey(buildingId: string, floorId: string | null | undefined): string {
  return `${buildingId}::${floorId?.trim() || ""}`;
}
