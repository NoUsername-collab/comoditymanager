"use server";

import { requireAdmin } from "@/lib/auth/require-admin";
import { loadDayAvailabilityDetail } from "@/services/availability-month";

export async function fetchDayAvailabilityDetailAction(
  iso: string,
  buildingId: string | null = null
) {
  await requireAdmin();
  return loadDayAvailabilityDetail(iso, buildingId);
}
