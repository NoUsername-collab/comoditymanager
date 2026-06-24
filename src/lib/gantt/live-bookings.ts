"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { BookingRow } from "@/services/bookings/types";

export const GANTT_LIVE_BOOKING_EVENT = "gantt:live-booking";
export const GANTT_REMOVE_BOOKING_EVENT = "gantt:remove-booking";

type GanttLiveBookingDetail = { booking: BookingRow };
type GanttRemoveBookingDetail = { bookingId: string };

export function publishGanttLiveBooking(booking: BookingRow) {
  window.dispatchEvent(
    new CustomEvent<GanttLiveBookingDetail>(GANTT_LIVE_BOOKING_EVENT, {
      detail: { booking },
    }),
  );
}

/** Hide a booking immediately after cancel — Gantt filters anulata server-side. */
export function removeGanttLiveBooking(bookingId: string) {
  window.dispatchEvent(
    new CustomEvent<GanttRemoveBookingDetail>(GANTT_REMOVE_BOOKING_EVENT, {
      detail: { bookingId },
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
  const [removedIds, setRemovedIds] = useState<Set<string>>(() => new Set());

  const onLiveBooking = useCallback((event: Event) => {
    const detail = (event as CustomEvent<GanttLiveBookingDetail>).detail;
    if (!detail?.booking?.id) return;
    setOverlays((prev) => {
      const next = new Map(prev);
      next.set(detail.booking.id, detail.booking);
      return next;
    });
    setRemovedIds((prev) => {
      if (!prev.has(detail.booking.id)) return prev;
      const next = new Set(prev);
      next.delete(detail.booking.id);
      return next;
    });
  }, []);

  const onRemoveBooking = useCallback((event: Event) => {
    const detail = (event as CustomEvent<GanttRemoveBookingDetail>).detail;
    if (!detail?.bookingId) return;
    setRemovedIds((prev) => {
      const next = new Set(prev);
      next.add(detail.bookingId);
      return next;
    });
    setOverlays((prev) => {
      if (!prev.has(detail.bookingId)) return prev;
      const next = new Map(prev);
      next.delete(detail.bookingId);
      return next;
    });
  }, []);

  useEffect(() => {
    window.addEventListener(GANTT_LIVE_BOOKING_EVENT, onLiveBooking);
    window.addEventListener(GANTT_REMOVE_BOOKING_EVENT, onRemoveBooking);
    return () => {
      window.removeEventListener(GANTT_LIVE_BOOKING_EVENT, onLiveBooking);
      window.removeEventListener(GANTT_REMOVE_BOOKING_EVENT, onRemoveBooking);
    };
  }, [onLiveBooking, onRemoveBooking]);

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
    setRemovedIds((prev) => {
      if (prev.size === 0) return prev;
      const serverIds = new Set(serverBookings.map((b) => b.id));
      let changed = false;
      const next = new Set(prev);
      for (const id of prev) {
        if (!serverIds.has(id)) {
          next.delete(id);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [serverBookings]);

  return useMemo(() => {
    const filtered = serverBookings.filter((b) => !removedIds.has(b.id));
    if (overlays.size === 0) return filtered;
    const merged = filtered.map(
      (b) => overlays.get(b.id) ?? b,
    );
    for (const [id, row] of overlays) {
      if (!removedIds.has(id) && !serverBookings.some((b) => b.id === id)) {
        merged.push(row);
      }
    }
    return merged;
  }, [serverBookings, overlays, removedIds]);
}