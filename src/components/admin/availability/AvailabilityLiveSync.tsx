"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";

/**
 * Live sync for availability dashboard.
 *
 * Subscribes to new bookings only (INSERT) — not updates/deletes,
 * because admin operations (confirm, cancel, date edits) already
 * trigger revalidation via server actions. Realtime is only for
 * NEW booking requests from the public form.
 *
 * Uses generous debounce + gap to prevent flickering.
 */

const LIVE_DEBOUNCE_MS = 5_000; // 5s — batch rapid booking requests
const MIN_REFRESH_GAP_MS = 45_000; // 45s — availability changes are not urgent

export function AvailabilityLiveSync() {
  const tCommon = useTranslations("admin.common");
  const tPage = useTranslations("admin.availability");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [live, setLive] = useState(false);
  const pendingRef = useRef(isPending);
  const refreshTimer = useRef<number | null>(null);
  const lastRefreshAt = useRef(0);

  useEffect(() => {
    pendingRef.current = isPending;
  }, [isPending]);

  useEffect(() => {
    function queueRefresh() {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") {
        return;
      }
      if (pendingRef.current) return;
      const now = Date.now();
      if (now - lastRefreshAt.current < MIN_REFRESH_GAP_MS) return;
      if (refreshTimer.current) {
        window.clearTimeout(refreshTimer.current);
      }
      refreshTimer.current = window.setTimeout(() => {
        refreshTimer.current = null;
        lastRefreshAt.current = Date.now();
        startTransition(() => {
          try {
            router.refresh();
          } catch {
            // Swallow refresh errors — prevents redirect loops
          }
        });
      }, LIVE_DEBOUNCE_MS);
    }

    let supabase: ReturnType<typeof createClient> | null = null;
    let channel: ReturnType<
      ReturnType<typeof createClient>["channel"]
    > | null = null;

    try {
      supabase = createClient();
      channel = supabase
        .channel("avail-bookings-live")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "bookings" },
          queueRefresh
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") setLive(true);
        });
    } catch {}

    return () => {
      if (refreshTimer.current) {
        window.clearTimeout(refreshTimer.current);
      }
      if (channel && supabase) supabase.removeChannel(channel);
    };
  }, [router, startTransition]);

  return (
    <span className="avail-live-pill" title={tPage("liveSyncTitle")}>
      <span
        className={[
          "avail-live-pill__dot",
          live && "avail-live-pill__dot--on",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-hidden
      />
      {live ? tPage("liveAvailability") : tCommon("syncing")}
    </span>
  );
}
