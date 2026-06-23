"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { BookingRow } from "@/services/bookings/types";

export const GANTT_LIVE_BOOKING_EVENT = "gantt:live-booking";

type GanttLiveBookingDetail = { booking: BookingRow };

export function publishGanttLiveBooking(booking: BookingRow) {
  window.dispatchEvent(
    new CustomEvent<GanttLiveBookingDetail>(GANTT_LIVE_BOOKING_EVENT, {
      detail: { booking },
    }),
  );
}

/** Soft sync with server data - avoids blocking UI after optimistic patch. */
export function deferGanttBackgroundRefresh(
  router: { refresh: () => void },
  delayMs = 5000,
) {
  window.setTimeout(() => router.refresh(), delayMs);
}

export function useGanttLiveBookings(serverBookings: BookingRow[]): BookingRow[] {
  const [overlays, setOverlays] = useState<Map<string, BookingRow>>(
    () => new Map(),
  );

  const onLiveBooking = useCallback((event: Event) => {
    const detail = (event as CustomEvent<GanttLiveBookingDetail>).detail;
    if (!detail?.booking?.id) return;
    setOverlays((prev) => {
      const next = new Map(prev);
      next.set(detail.booking.id, detail.booking);
      return next;
    });
  }, []);

  useEffect(() => {
    window.addEventListener(GANTT_LIVE_BOOKING_EVENT, onLiveBooking);
    return () =>
      window.removeEventListener(GANTT_LIVE_BOOKING_EVENT, onLiveBooking);
  }, [onLiveBooking]);

  useEffect(() => {
    setOverlays((prev) => {
      if (prev.size === 0) return prev;
      const serverIds = new Set(serverBookings.map((b) => b.id));
      let changed = false;
      const next = new Map(prev);
      for (const id of prev.keys()) {
        if (!serverIds.has(id)) {
          next.delete(id);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [serverBookings]);

  return useMemo(() => {
    if (overlays.size === 0) return serverBookings;
    const merged = serverBookings.map(
      (b) => overlays.get(b.id) ?? b,
    );
    for (const [id, row] of overlays) {
      if (!serverBookings.some((b) => b.id === id)) {
        merged.push(row);
      }
    }
    return merged;
  }, [serverBookings, overlays]);
}