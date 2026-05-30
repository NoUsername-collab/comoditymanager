/**
 * Read/write the simulation state cookie.
 * Works in both Server Components and Server Actions.
 *
 * The cookie payload is HMAC-signed to prevent operators or
 * devtools manipulation from forging a simulation state.
 */

import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import type { SimState, SimStatus } from "./sim-types";
import { SIM_COOKIE } from "./sim-types";
import { todayReal } from "./sim-clock";

/** Secret for signing sim cookies — falls back to a build-time random */
function getSimSecret(): string {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SIM_COOKIE_SECRET ??
    "sim-dev-fallback-secret"
  );
}

function signPayload(payload: string): string {
  return createHmac("sha256", getSimSecret()).update(payload).digest("hex");
}

function encodeSimCookie(state: SimState): string {
  const payload = JSON.stringify(state);
  const sig = signPayload(payload);
  return `${Buffer.from(payload).toString("base64")}.${sig}`;
}

function decodeSimCookie(raw: string): SimState | null {
  const dotIdx = raw.lastIndexOf(".");
  if (dotIdx === -1) return null;

  const b64 = raw.slice(0, dotIdx);
  const sig = raw.slice(dotIdx + 1);

  let payload: string;
  try {
    payload = Buffer.from(b64, "base64").toString("utf-8");
  } catch {
    return null;
  }

  // Verify HMAC
  const expected = signPayload(payload);
  try {
    const a = Buffer.from(sig, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }

  try {
    const parsed = JSON.parse(payload) as SimState;
    if (parsed.active !== true || !parsed.currentDate) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Read the current simulation status from cookies.
 * Safe to call in any server context — returns inactive if cookie is absent or invalid.
 */
export async function getSimStatus(): Promise<SimStatus> {
  try {
    const jar = await cookies();
    const raw = jar.get(SIM_COOKIE)?.value;
    if (!raw) return { active: false };

    const state = decodeSimCookie(raw);
    if (!state) return { active: false };
    return state;
  } catch {
    return { active: false };
  }
}

/**
 * Check whether sim is active (reads cookie).
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
 * Set the simulation state cookie (HMAC-signed).
 */
export async function setSimCookie(state: SimState): Promise<void> {
  const jar = await cookies();
  jar.set(SIM_COOKIE, encodeSimCookie(state), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    // 8h max — simulation auto-expires
    maxAge: 8 * 60 * 60,
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
