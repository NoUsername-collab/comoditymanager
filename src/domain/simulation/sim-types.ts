/**
 * Simulation mode types.
 *
 * The simulation system creates a sandboxed copy of the database
 * (Supabase schema swap) and a virtual clock that can be advanced
 * manually or automatically. All app logic runs identically —
 * it just operates on the simulation schema with a fake "today".
 */

export type SimState = {
  active: true;
  /** ISO date of the simulated "today" */
  currentDate: string;
  /** ISO date when the simulation was started */
  startedAt: string;
  /** Real ISO date when the simulation began (for reference) */
  realStartDate: string;
  /** Number of days advanced since start */
  daysAdvanced: number;
};

export type SimStateInactive = {
  active: false;
};

export type SimStatus = SimState | SimStateInactive;

/** Cookie name for simulation state */
export const SIM_COOKIE = "casa_emil_sim";
