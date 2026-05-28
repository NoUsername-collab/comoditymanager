"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  startSimulation,
  stopSimulation,
  advanceSimulation,
} from "@/services/simulation";

type SimActionResult =
  | { ok: true; currentDate?: string; daysAdvanced?: number }
  | { ok: false; error: string };

function revalidateAll() {
  revalidatePath("/admin", "layout");
}

export async function startSimulationAction(): Promise<SimActionResult> {
  await requireAdmin();

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
  await requireAdmin();

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
  await requireAdmin();

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
  await requireAdmin();

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
  await requireAdmin();

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
