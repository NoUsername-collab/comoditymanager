export type AvailabilityPressure = "relaxed" | "moderate" | "tight" | "full";

export function occupancyPercent(occupied: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((occupied / total) * 100);
}

export function availabilityPressure(
  freeRooms: number,
  totalRooms: number
): AvailabilityPressure {
  if (totalRooms <= 0 || freeRooms <= 0) return "full";
  if (freeRooms === 1) return "tight";
  if (freeRooms <= 2 || freeRooms / totalRooms <= 0.25) return "moderate";
  return "relaxed";
}

export function pressureLabel(pressure: AvailabilityPressure): string {
  const map: Record<AvailabilityPressure, string> = {
    relaxed: "Good availability",
    moderate: "Moderate pressure",
    tight: "Almost full",
    full: "Fully occupied",
  };
  return map[pressure];
}

/** CSS class suffix for heat cell */
export function heatLevelClass(
  freeRooms: number,
  totalRooms: number
): string {
  const p = availabilityPressure(freeRooms, totalRooms);
  return `avail-heat-cell--${p}`;
}
