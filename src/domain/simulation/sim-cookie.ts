/**
 * Read/write the simulation state cookie.
 * Works in both Server Components and Server Actions.
 */

import { cookies } from "next/headers";
import type { SimState, SimStatus } from "./sim-types";
import { SIM_COOKIE } from "./sim-types";
import { todayReal } from "./sim-clock";

/**
 * Read the current simulation status from cookies.
 * Safe to call in any server context — returns inactive if cookie is absent.
 */
export async function getSimStatus(): Promise<SimStatus> {
  try {
    const jar = await cookies();
    const raw = jar.get(SIM_COOKIE)?.value;
    if (!raw) return { active: false };

    const parsed = JSON.parse(raw) as SimState;
    if (parsed.active !== true || !parsed.currentDate) {
      return { active: false };
    }
    return parsed;
  } catch {
    return { active: false };
  }
}

/**
 * Synchronous check — reads from cookies and returns whether sim is active.
 */
export async function isSimActive(): Promise<boolean> {
  const status = await getSimStatus();
  return status.active;
}

/**
 * Get the simulated "today" date, or null if not in simulation.
 */
export async function getSimDate(): Promise<string | null> {
  const status = await getSimStatus();
  return status.active ? status.currentDate : null;
}

/**
 * Set the simulation state cookie.
 */
export async function setSimCookie(state: SimState): Promise<void> {
  const jar = await cookies();
  jar.set(SIM_COOKIE, JSON.stringify(state), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    // 24h max — simulation auto-expires
    maxAge: 24 * 60 * 60,
  });
}

/**
 * Clear the simulation cookie.
 */
export async function clearSimCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(SIM_COOKIE);
}

/**
 * Create initial simulation state.
 */
export function createSimState(): SimState {
  const today = todayReal();
  return {
    active: true,
    currentDate: today,
    startedAt: new Date().toISOString(),
    realStartDate: today,
    daysAdvanced: 0,
  };
}

/**
 * Advance the simulation by N days.
 */
export function advanceSimState(state: SimState, days: number): SimState {
  const d = new Date(state.currentDate + "T12:00:00");
  d.setDate(d.getDate() + days);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return {
    ...state,
    currentDate: `${yyyy}-${mm}-${dd}`,
    daysAdvanced: state.daysAdvanced + days,
  };
}
