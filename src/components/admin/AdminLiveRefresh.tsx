"use client";

import { useTranslations } from "next-intl";

/**
 * AdminLiveRefresh — Supabase Realtime + polling TEMPORARILY DISABLED.
 *
 * The realtime subscription + router.refresh() was causing cascading
 * re-renders, UI flickering, and redirect-to-home crashes.
 *
 * Renders the sync indicator UI but does NOT subscribe or auto-refresh.
 * Manual page refresh (F5) still works normally.
 *
 * Will be re-enabled with proper guards after stability is confirmed.
 */
export function AdminLiveRefresh() {
  const tCommon = useTranslations("admin.common");

  return (
    <div className="admin-hud__sync" title={tCommon("autoRefreshTitle")}>
      <span className="admin-hud__sync-dot" aria-hidden />
      <span>{tCommon("auto3m")} · —</span>
    </div>
  );
}
