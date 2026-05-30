"use server";

import { revalidatePath } from "next/cache";
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

type SimActionResult =
  | { ok: true; currentDate?: string; daysAdvanced?: number }
  | { ok: false; error: string };

function revalidateAll() {
  revalidatePath("/admin", "layout");
}

export async function startSimulationAction(): Promise<SimActionResult> {
  await requireStaffRole(["admin"]);

  try {
    const state = await startSimulation();
    revalidateAll();
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
    revalidateAll();
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
    revalidateAll();
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
    revalidateAll();
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
    revalidateAll();
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

/**
 * Jump to the next check-in date.
 */
export async function advanceToNextCheckInAction(): Promise<SimActionResult> {
  await requireStaffRole(["admin"]);

  try {
    const sim = await getSimStatus();
    if (!sim.active) return { ok: false, error: "simulation.not_active" };

    const nextCI = await findNextCheckIn(sim.currentDate);
    if (!nextCI) return { ok: false, error: "simulation.no_upcoming_checkin" };

    const state = await advanceSimulationToDate(nextCI);
    revalidateAll();
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

/**
 * Jump to the next check-out date.
 */
export async function advanceToNextCheckOutAction(): Promise<SimActionResult> {
  await requireStaffRole(["admin"]);

  try {
    const sim = await getSimStatus();
    if (!sim.active) return { ok: false, error: "simulation.not_active" };

    const nextCO = await findNextCheckOut(sim.currentDate);
    if (!nextCO) return { ok: false, error: "simulation.no_upcoming_checkout" };

    const state = await advanceSimulationToDate(nextCO);
    revalidateAll();
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
