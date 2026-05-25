"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const LIVE_DEBOUNCE_MS = 1_500;
const MIN_REFRESH_GAP_MS = 15_000;

export function AvailabilityLiveSync() {
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
          router.refresh();
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
          { event: "*", schema: "public", table: "bookings" },
          queueRefresh
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "booking_rooms" },
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
    <span className="avail-live-pill" title="Actualizare la confirmări / cereri noi">
      <span
        className={[
          "avail-live-pill__dot",
          live && "avail-live-pill__dot--on",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-hidden
      />
      {live ? "Live disponibilitate" : "Sincronizare…"}
    </span>
  );
}
