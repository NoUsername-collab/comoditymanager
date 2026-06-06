"use client";

/**
 * AvailabilityLiveSync — TEMPORARILY DISABLED.
 *
 * The Supabase Realtime subscription was causing router.refresh() cascades
 * that crashed the app (infinite re-render loops, redirect to home).
 *
 * The admin already has AdminLiveRefresh in the layout which polls every 5 min.
 * This component will be re-enabled after the root cause is fixed.
 */
export function AvailabilityLiveSync() {
  return null;
}
