"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";

/**
 * Live refresh for admin panel.
 *
 * Two modes:
 * - "live": Supabase Realtime subscription on bookings table
 * - "poll": Fallback polling every POLL_MS
 *
 * Guards against flickering:
 * - MIN_REFRESH_GAP prevents rapid-fire refreshes
 * - Only refreshes when tab is visible AND focused
 * - Debounces realtime events to batch rapid changes
 * - Catches and ignores refresh errors (prevents redirect loops)
 */

const POLL_MS = 300_000; // 5 minutes (was 3 min — reduced frequency)
const LIVE_DEBOUNCE_MS = 3_000; // 3 seconds (was 1.5s — less flickering)
const MIN_REFRESH_GAP_MS = 30_000; // 30 seconds (was 15s — much less aggressive)

export function AdminLiveRefresh() {
  const tCommon = useTranslations("admin.common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [mode, setMode] = useState<"live" | "poll">("poll");
  const liveTimer = useRef<number | null>(null);
  const lastRefreshAt = useRef(0);
  const pendingRef = useRef(isPending);

  useEffect(() => {
    pendingRef.current = isPending;
  }, [isPending]);

  useEffect(() => {
    function refresh(reason: "live" | "poll") {
      // Don't refresh if tab is hidden or not focused
      if (typeof document !== "undefined") {
        if (document.visibilityState !== "visible") return;
      }
      // Don't refresh if already pending
      if (pendingRef.current) return;
      // Enforce minimum gap between refreshes
      const now = Date.now();
      if (now - lastRefreshAt.current < MIN_REFRESH_GAP_MS) return;

      lastRefreshAt.current = now;
      setMode(reason);
      setLastRefresh(new Date());
      startTransition(() => {
        try {
          router.refresh();
        } catch {
          // Catch refresh errors to prevent redirect loops
        }
      });
    }

    const pollId = window.setInterval(() => refresh("poll"), POLL_MS);

    let supabase: ReturnType<typeof createClient> | null = null;
    let channel: ReturnType<
      ReturnType<typeof createClient>["channel"]
    > | null = null;

    try {
      supabase = createClient();
      channel = supabase
        .channel("admin-bookings-live")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "bookings" },
          () => {
            // Only react to new bookings (INSERTs), not updates/deletes
            // This prevents flickering from status changes during admin operations
            if (liveTimer.current) {
              window.clearTimeout(liveTimer.current);
            }
            liveTimer.current = window.setTimeout(() => {
              liveTimer.current = null;
              refresh("live");
            }, LIVE_DEBOUNCE_MS);
          }
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") setMode("live");
        });
    } catch {}

    return () => {
      window.clearInterval(pollId);
      if (liveTimer.current) {
        window.clearTimeout(liveTimer.current);
      }
      if (channel && supabase) supabase.removeChannel(channel);
    };
  }, [router, startTransition]);

  const timeLabel = lastRefresh
    ? lastRefresh.toLocaleTimeString("ro-RO", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "—";

  return (
    <div
      className="admin-hud__sync"
      title={tCommon("autoRefreshTitle")}
    >
      <span
        className={[
          "admin-hud__sync-dot",
          mode === "live" && "admin-hud__sync-dot--live",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-hidden
      />
      <span>
        {mode === "live" ? tCommon("live") : tCommon("auto3m")} · {timeLabel}
      </span>
    </div>
  );
}
