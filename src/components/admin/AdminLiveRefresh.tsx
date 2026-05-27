"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";

const POLL_MS = 180_000;
const LIVE_DEBOUNCE_MS = 1_500;
const MIN_REFRESH_GAP_MS = 15_000;

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
      if (typeof document !== "undefined" && document.visibilityState !== "visible") {
        return;
      }
      if (pendingRef.current) return;
      const now = Date.now();
      if (now - lastRefreshAt.current < MIN_REFRESH_GAP_MS) return;

      lastRefreshAt.current = now;
      setMode(reason);
      setLastRefresh(new Date());
      startTransition(() => {
        router.refresh();
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
          { event: "*", schema: "public", table: "bookings" },
          () => {
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
