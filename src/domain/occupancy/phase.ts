import type { OccupancyPhase } from "@/domain/occupancy/types";
import { todayIso } from "@/lib/stay-dates";

/** Fază temporală: past | active | future */
export function occupancyPhase(
  checkIn: string,
  checkOut: string,
  referenceDate = todayIso()
): OccupancyPhase {
  if (checkOut < referenceDate) return "past";
  if (checkIn <= referenceDate && checkOut >= referenceDate) return "active";
  return "future";
}
