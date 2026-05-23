"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function AvailabilityLiveSync() {
  const router = useRouter();
  const [live, setLive] = useState(false);

  useEffect(() => {
    let supabase: ReturnType<typeof createClient> | null = null;
    let channel: ReturnType<
      ReturnType<typeof createClient>["channel"]
    > | null = null;

    try {
      supabase = createClient();
      const refresh = () => router.refresh();
      channel = supabase
        .channel("avail-bookings-live")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "bookings" },
          refresh
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "booking_rooms" },
          refresh
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") setLive(true);
        });
    } catch {
      setLive(false);
    }

    return () => {
      if (channel && supabase) supabase.removeChannel(channel);
    };
  }, [router]);

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
