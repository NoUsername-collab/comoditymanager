"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const POLL_MS = 50_000;

export function AdminLiveRefresh() {
  const router = useRouter();
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [mode, setMode] = useState<"live" | "poll" | "init">("init");
  const refreshing = useRef(false);

  useEffect(() => {
    function refresh(reason: "live" | "poll") {
      if (refreshing.current) return;
      refreshing.current = true;
      setMode(reason);
      router.refresh();
      setLastRefresh(new Date());
      window.setTimeout(() => {
        refreshing.current = false;
      }, 2000);
    }

    refresh("poll");

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
          () => refresh("live")
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") setMode("live");
        });
    } catch {
      setMode("poll");
    }

    return () => {
      window.clearInterval(pollId);
      if (channel && supabase) supabase.removeChannel(channel);
    };
  }, [router]);

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
      title="Actualizare automată: Realtime + reîmprospătare la 50s"
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
        {mode === "live" ? "Live" : "Auto 50s"} · {timeLabel}
      </span>
    </div>
  );
}
