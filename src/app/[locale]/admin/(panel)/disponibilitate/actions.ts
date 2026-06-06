"use server";

import { requireAdmin } from "@/lib/auth/require-admin";
import { loadDayAvailabilityDetail } from "@/services/availability-month";
import type { DayAvailabilityDetail } from "@/services/availability-month";

export async function fetchDayAvailabilityDetailAction(
  iso: string,
  buildingId: string | null = null,
  featureFilter: "all" | "ac" | "fridge" = "all"
): Promise<{ ok: true; data: DayAvailabilityDetail | null } | { ok: false; error: string }> {
  try {
    await requireAdmin();
    const data = await loadDayAvailabilityDetail(iso, buildingId, featureFilter);
    return { ok: true, data };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "availability.load_failed",
    };
  }
}
