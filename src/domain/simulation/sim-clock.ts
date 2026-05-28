/**
 * Simulation clock.
 *
 * `todayReal()`       — always the real system date (sync, safe everywhere)
 * `getEffectiveToday()` — sim date when active, otherwise real date (async, server-only)
 */

import { getSimDate } from "./sim-cookie";

/**
 * The real system date — never affected by simulation.
 */
export function todayReal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Returns the simulated date when simulation is active,
 * otherwise the real system date.
 * Async — reads from cookies. Server-only.
 */
export async function getEffectiveToday(): Promise<string> {
  try {
    const simDate = await getSimDate();
    return simDate ?? todayReal();
  } catch {
    return todayReal();
  }
}
