/**
 * Simulation service — manages the lifecycle of a simulation session.
 *
 * Uses in-place backup: on start, all tables are copied to _sim_backup_*
 * tables. During simulation, the app operates on the real tables normally.
 * On stop, all tables are restored from backup and backups are dropped.
 *
 * Zero configuration required — works with any Supabase project.
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

/**
 * Start a new simulation session.
 * Creates backup copies of all tables.
 */
export async function startSimulation(): Promise<SimState> {
  // Safety: don't start if already active
  const current = await getSimStatus();
  if (current.active) {
    throw new Error("simulation.already_active");
  }

  // Create backup via Postgres function
  const supabase = createAdminClient();
  const { error } = await supabase.rpc("sim_start");

  if (error) {
    throw new Error(`simulation.start_failed: ${error.message}`);
  }

  // Set the simulation cookie
  const state = createSimState();
  await setSimCookie(state);

  return state;
}

/**
 * Stop the current simulation and restore all data from backup.
 */
export async function stopSimulation(): Promise<void> {
  // Restore from backup via Postgres function
  const supabase = createAdminClient();
  const { error } = await supabase.rpc("sim_stop");

  if (error) {
    console.error("Failed to restore from simulation backup:", error.message);
    // Still clear the cookie even if restore fails
  }

  // Clear the cookie
  await clearSimCookie();
}

/**
 * Advance the simulation clock by N days.
 */
export async function advanceSimulation(days = 1): Promise<SimState> {
  const current = await getSimStatus();
  if (!current.active) {
    throw new Error("simulation.not_active");
  }

  const newState = advanceSimState(current, days);
  await setSimCookie(newState);
  return newState;
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
  const { data, error } = await supabase.rpc("sim_is_active");
  if (error) return false;
  return data === true;
}

/**
 * Emergency cleanup — force-drop backup tables without restoring.
 * Use only if sim_stop fails.
 */
export async function forceCleanupSimulation(): Promise<void> {
  const supabase = createAdminClient();
  await supabase.rpc("sim_force_cleanup");
  await clearSimCookie();
}
