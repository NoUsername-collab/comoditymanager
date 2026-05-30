/**
 * Simulation service — manages the lifecycle of a simulation session.
 *
 * v2: Schema-based sandbox.
 *
 * Start → CREATE SCHEMA sim_sandbox + copy all tables with data/FKs
 * During → app's Supabase client targets sim_sandbox (real data untouched)
 * Stop  → DROP SCHEMA sim_sandbox CASCADE (instant, clean)
 *
 * Advance: moves the simulated clock forward and calls sim_advance()
 * which processes time-dependent events in sim_sandbox.
 */

import { createAdminClient, createPublicAdminClient } from "@/lib/supabase/admin";
import {
  getSimStatus,
  setSimCookie,
  clearSimCookie,
  createSimState,
  advanceSimState,
} from "@/domain/simulation/sim-cookie";
import type { SimState, SimStatus } from "@/domain/simulation/sim-types";
import { getActiveTenantIdForData } from "@/lib/tenant/active";

export type SimAdvanceResult = {
  checked_in: number;
  checked_out: number;
  holds_expired: number;
};

/**
 * Start a new simulation session.
 * Creates sim_sandbox schema with full copy of all business tables.
 * Real data in 'public' is never modified.
 */
export async function startSimulation(): Promise<SimState> {
  // Safety: don't start if already active
  const current = await getSimStatus();
  if (current.active) {
    throw new Error("simulation.already_active");
  }

  // RPC lives in public schema — use public-only client
  const supabase = createPublicAdminClient();
  const { error } = await supabase.rpc("sim_start");

  if (error) {
    throw new Error(`simulation.start_failed: ${error.message}`);
  }

  // Set the simulation cookie AFTER schema is created
  const state = createSimState();
  await setSimCookie(state);

  return state;
}

/**
 * Stop the current simulation and drop the sandbox schema.
 * Instant, clean — one DROP SCHEMA CASCADE.
 */
export async function stopSimulation(): Promise<void> {
  // RPC lives in public schema — use public-only client
  const supabase = createPublicAdminClient();
  const { error } = await supabase.rpc("sim_stop");

  if (error) {
    console.error("sim_stop RPC failed:", error.message);
    // Still clear the cookie
  }

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

  // RPC lives in public schema, but operates on sim_sandbox internally
  const supabase = createPublicAdminClient();
  let dbResult: SimAdvanceResult | undefined;

  try {
    const { data, error } = await supabase.rpc("sim_advance", {
      p_new_today: newState.currentDate,
    });

    if (error) {
      console.error("sim_advance RPC failed:", error.message);
    } else if (data) {
      dbResult = data as SimAdvanceResult;
    }
  } catch (e) {
    console.error("sim_advance not available:", e);
  }

  await setSimCookie(newState);
  return { ...newState, dbResult };
}

/**
 * Advance simulation to a specific target date (ISO string).
 */
export async function advanceSimulationToDate(
  targetDate: string
): Promise<SimState & { dbResult?: SimAdvanceResult }> {
  const current = await getSimStatus();
  if (!current.active) {
    throw new Error("simulation.not_active");
  }

  const curD = new Date(current.currentDate + "T12:00:00");
  const tgtD = new Date(targetDate + "T12:00:00");
  const diffMs = tgtD.getTime() - curD.getTime();
  const days = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (days <= 0) {
    throw new Error("simulation.target_not_future");
  }

  return advanceSimulation(days);
}

/**
 * Find the next check-in date after the current simulation date.
 * Uses sim-aware client (reads from sim_sandbox when active).
 */
export async function findNextCheckIn(
  afterDate: string
): Promise<string | null> {
  const tenantId = await getActiveTenantIdForData();
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("bookings")
    .select("check_in")
    .eq("tenant_id", tenantId)
    .eq("status", "confirmata")
    .gt("check_in", afterDate)
    .is("actual_check_in_at", null)
    .order("check_in", { ascending: true })
    .limit(1)
    .single();

  if (error || !data) return null;
  return data.check_in as string;
}

/**
 * Find the next check-out date after the current simulation date.
 * Uses sim-aware client (reads from sim_sandbox when active).
 */
export async function findNextCheckOut(
  afterDate: string
): Promise<string | null> {
  const tenantId = await getActiveTenantIdForData();
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("bookings")
    .select("check_out")
    .eq("tenant_id", tenantId)
    .eq("status", "confirmata")
    .gt("check_out", afterDate)
    .not("actual_check_in_at", "is", null)
    .is("actual_check_out_at", null)
    .order("check_out", { ascending: true })
    .limit(1)
    .single();

  if (error || !data) return null;
  return data.check_out as string;
}

/**
 * Get the current simulation status.
 */
export async function getSimulationStatus(): Promise<SimStatus> {
  return getSimStatus();
}

/**
 * Check if simulation sandbox schema exists in the database.
 */
export async function isSimBackupPresent(): Promise<boolean> {
  const supabase = createPublicAdminClient();
  try {
    const { data, error } = await supabase.rpc("sim_is_active");
    if (error) return false;
    return data === true;
  } catch {
    return false;
  }
}

/**
 * Emergency cleanup — force-drop sandbox schema.
 */
export async function forceCleanupSimulation(): Promise<void> {
  const supabase = createPublicAdminClient();
  try {
    await supabase.rpc("sim_force_cleanup");
  } catch (e) {
    console.error("sim_force_cleanup not available:", e);
  }
  await clearSimCookie();
}
