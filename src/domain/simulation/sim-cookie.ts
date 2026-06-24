/**
 * Read/write the simulation state cookie.
 * Works in both Server Components and Server Actions.
 *
 * The cookie payload is HMAC-signed to prevent operators or
 * devtools manipulation from forging a simulation state.
 */

import { cache } from "react";
import { cookies } from "next/headers";
import { hmacSha256Hex, timingSafeEqualHex } from "@/lib/auth/web-hmac";
import type { SimState, SimStatus } from "./sim-types";
import { SIM_COOKIE } from "./sim-types";
import { todayReal } from "./sim-clock";

import { isProductionRuntime } from "@/lib/security/production-runtime";

/** Secret for signing sim cookies — never reuse the Supabase service role key. */
function getSimSecret(): string {
  const secret = process.env.SIM_COOKIE_SECRET?.trim();
  if (secret && secret.length >= 32) return secret;

  if (isProductionRuntime()) {
    throw new Error(
      "SIM_COOKIE_SECRET must be set in production when using simulation (min 32 chars)"
    );
  }

  return secret ?? "sim-dev-fallback-secret";
}

async function signPayload(payload: string): Promise<string> {
  return hmacSha256Hex(getSimSecret(), payload);
}

async function encodeSimCookie(state: SimState): Promise<string> {
  const payload = JSON.stringify(state);
  const sig = await signPayload(payload);
  return `${Buffer.from(payload).toString("base64")}.${sig}`;
}

async function decodeSimCookie(raw: string): Promise<SimState | null> {
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

  const expected = await signPayload(payload);
  if (!timingSafeEqualHex(sig, expected)) return null;

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
export const getSimStatus = cache(async (): Promise<SimStatus> => {
  try {
    const jar = await cookies();
    const raw = jar.get(SIM_COOKIE)?.value;
    if (!raw) return { active: false };

    const state = await decodeSimCookie(raw);
    if (!state) return { active: false };
    return state;
  } catch {
    return { active: false };
  }
});

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
  jar.set(SIM_COOKIE, await encodeSimCookie(state), {
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
