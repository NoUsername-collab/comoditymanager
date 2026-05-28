/**
 * Simulation service — manages the lifecycle of a simulation session.
 *
 * Uses in-place backup: on start, all tables are copied to _sim_backup_*
 * tables. During simulation, the app operates on the real tables normally.
 * On stop, all tables are restored from backup and backups are dropped.
 *
 * Advance: moves the simulated clock forward by N days and calls sim_advance()
 * which processes time-dependent events (auto check-in, check-out, hold expiry).
 */

import { createAdminClient } from "@/lib/supabase/admin";
import {
  getSimStatus,
  setSimCookie,
  clearSimCookie,
  createSimState,
  advanceSimState,
} from "@/domain/simulation/sim-cookie";
import type { SimState, SimStatus } from "@/domain/simulation/sim-types";

export type SimAdvanceResult = {
  checked_in: number;
  checked_out: number;
  holds_expired: number;
};

/**
 * Start a new simulation session.
 * Creates backup copies of all tables via sim_start() RPC.
 * Falls back to cookie-only mode if the RPC doesn't exist yet.
 */
export async function startSimulation(): Promise<SimState> {
  // Safety: don't start if already active
  const current = await getSimStatus();
  if (current.active) {
    throw new Error("simulation.already_active");
  }

  // Create backup via Postgres function
  const supabase = createAdminClient();
  let rpcWorked = false;

  try {
    const { error } = await supabase.rpc("sim_start");

    if (error) {
      // Log but don't throw — fall back to cookie-only mode
      console.error(
        "sim_start RPC failed (migration may not be applied):",
        error.message
      );
    } else {
      rpcWorked = true;
    }
  } catch (e) {
    // RPC doesn't exist — graceful degradation
    console.error("sim_start not available:", e);
  }

  // Set the simulation cookie regardless
  const state = createSimState();
  await setSimCookie(state);

  if (!rpcWorked) {
    console.warn(
      "⚠ Simulation started in cookie-only mode (no DB backup).",
      "Run the 023_simulation.sql migration to enable full simulation."
    );
  }

  return state;
}

/**
 * Stop the current simulation and restore all data from backup.
 */
export async function stopSimulation(): Promise<void> {
  // Restore from backup via Postgres function
  const supabase = createAdminClient();

  try {
    const { error } = await supabase.rpc("sim_stop");

    if (error) {
      console.error(
        "Failed to restore from simulation backup:",
        error.message
      );
      // Still clear the cookie even if restore fails
    }
  } catch (e) {
    console.error("sim_stop not available:", e);
  }

  // Clear the cookie
  await clearSimCookie();
}

/**
 * Advance the simulation clock by N days.
 * Also processes time-dependent database events via sim_advance().
 */
export async function advanceSimulation(
  days = 1
): Promise<SimState & { dbResult?: SimAdvanceResult }> {
  const current = await getSimStatus();
  if (!current.active) {
    throw new Error("simulation.not_active");
  }

  const newState = advanceSimState(current, days);

  // Process time-dependent events in the database
  const supabase = createAdminClient();
  let dbResult: SimAdvanceResult | undefined;

  try {
    const { data, error } = await supabase.rpc("sim_advance", {
      p_new_today: newState.currentDate,
    });

    if (error) {
      console.error("sim_advance RPC failed:", error.message);
      // Don't throw — still update the cookie so the date moves forward.
      // The RPC might not exist yet if migration hasn't been run.
    } else if (data) {
      dbResult = data as SimAdvanceResult;
    }
  } catch (e) {
    // RPC doesn't exist yet — graceful degradation
    console.error("sim_advance not available:", e);
  }

  await setSimCookie(newState);
  return { ...newState, dbResult };
}

/**
 * Get the current simulation status.
 */
export async function getSimulationStatus(): Promise<SimStatus> {
  return getSimStatus();
}

/**
 * Check if simulation backup tables exist in the database.
 */
export async function isSimBackupPresent(): Promise<boolean> {
  const supabase = createAdminClient();
  try {
    const { data, error } = await supabase.rpc("sim_is_active");
    if (error) return false;
    return data === true;
  } catch {
    return false;
  }
}

/**
 * Emergency cleanup — force-drop backup tables without restoring.
 * Use only if sim_stop fails.
 */
export async function forceCleanupSimulation(): Promise<void> {
  const supabase = createAdminClient();
  try {
    await supabase.rpc("sim_force_cleanup");
  } catch (e) {
    console.error("sim_force_cleanup not available:", e);
  }
  await clearSimCookie();
}
