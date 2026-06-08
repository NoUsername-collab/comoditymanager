"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { requireStaffRole } from "@/lib/auth/require-admin";
import {
  startSimulation,
  stopSimulation,
  advanceSimulation,
  advanceSimulationToDate,
  findNextCheckIn,
  findNextCheckOut,
} from "@/services/simulation";
import { getSimStatus } from "@/domain/simulation/sim-cookie";
import { CACHE_TAGS, tenantTag } from "@/lib/cache-tags";
import { resolveTenantIdForData } from "@/lib/tenant/resolve-id";

type SimActionResult =
  | { ok: true; currentDate?: string; daysAdvanced?: number }
  | { ok: false; error: string };

async function revalidateSimSurfaces() {
  const tenantId = await resolveTenantIdForData().catch(() => null);
  if (tenantId) {
    revalidateTag(tenantTag(tenantId, CACHE_TAGS.bookingCounts), "max");
  } else {
    revalidateTag(CACHE_TAGS.bookingCounts, "max");
  }
  revalidatePath("/admin");
  revalidatePath("/admin/calendar");
  revalidatePath("/admin/cazari");
  revalidatePath("/admin/disponibilitate");
}

export async function startSimulationAction(): Promise<SimActionResult> {
  await requireStaffRole(["admin"]);

  try {
    const state = await startSimulation();
    await revalidateSimSurfaces();
    return {
      ok: true,
      currentDate: state.currentDate,
      daysAdvanced: state.daysAdvanced,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "simulation.start_failed",
    };
  }
}

export async function stopSimulationAction(): Promise<SimActionResult> {
  await requireStaffRole(["admin"]);

  try {
    await stopSimulation();
    await revalidateSimSurfaces();
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "simulation.stop_failed",
    };
  }
}

export async function advanceDayAction(): Promise<SimActionResult> {
  await requireStaffRole(["admin"]);

  try {
    const state = await advanceSimulation(1);
    await revalidateSimSurfaces();
    return {
      ok: true,
      currentDate: state.currentDate,
      daysAdvanced: state.daysAdvanced,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "simulation.advance_failed",
    };
  }
}

export async function advanceWeekAction(): Promise<SimActionResult> {
  await requireStaffRole(["admin"]);

  try {
    const state = await advanceSimulation(7);
    await revalidateSimSurfaces();
    return {
      ok: true,
      currentDate: state.currentDate,
      daysAdvanced: state.daysAdvanced,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "simulation.advance_failed",
    };
  }
}

export async function advanceMonthAction(): Promise<SimActionResult> {
  await requireStaffRole(["admin"]);

  try {
    const state = await advanceSimulation(30);
    await revalidateSimSurfaces();
    return {
      ok: true,
      currentDate: state.currentDate,
      daysAdvanced: state.daysAdvanced,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "simulation.advance_failed",
    };
  }
}

export async function advanceToNextCheckInAction(): Promise<SimActionResult> {
  await requireStaffRole(["admin"]);

  try {
    const sim = await getSimStatus();
    if (!sim.active) return { ok: false, error: "simulation.not_active" };

    const nextCI = await findNextCheckIn(sim.currentDate);
    if (!nextCI) return { ok: false, error: "simulation.no_upcoming_checkin" };

    const state = await advanceSimulationToDate(nextCI);
    await revalidateSimSurfaces();
    return {
      ok: true,
      currentDate: state.currentDate,
      daysAdvanced: state.daysAdvanced,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "simulation.advance_failed",
    };
  }
}

export async function advanceToNextCheckOutAction(): Promise<SimActionResult> {
  await requireStaffRole(["admin"]);

  try {
    const sim = await getSimStatus();
    if (!sim.active) return { ok: false, error: "simulation.not_active" };

    const nextCO = await findNextCheckOut(sim.currentDate);
    if (!nextCO) return { ok: false, error: "simulation.no_upcoming_checkout" };

    const state = await advanceSimulationToDate(nextCO);
    await revalidateSimSurfaces();
    return {
      ok: true,
      currentDate: state.currentDate,
      daysAdvanced: state.daysAdvanced,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "simulation.advance_failed",
    };
  }
}
