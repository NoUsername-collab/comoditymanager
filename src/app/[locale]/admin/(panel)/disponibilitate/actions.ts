"use server";

import { requireAdmin } from "@/lib/auth/require-admin";
import {
  loadDayAvailabilityDetail,
  loadDayAvailabilityDetailWithKnownDay,
  type DayAvailability,
} from "@/services/availability-month";

export async function fetchDayAvailabilityDetailAction(
  iso: string,
  buildingId: string | null = null,
  featureFilter: "all" | "ac" | "fridge" = "all",
  knownDay?: DayAvailability | null
) {
  await requireAdmin();
  if (knownDay && knownDay.iso === iso) {
    return loadDayAvailabilityDetailWithKnownDay(
      knownDay,
      buildingId,
      featureFilter
    );
  }
  return loadDayAvailabilityDetail(iso, buildingId, featureFilter);
}
