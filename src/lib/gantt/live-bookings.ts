"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { occupancyPhase } from "@/domain/occupancy/phase";
import type { OccupancySegment } from "@/domain/occupancy/types";
import {
  mergeGanttLiveBookings,
  mergeGanttLiveOccupancy,
} from "@/domain/gantt/live-occupancy";
import type { BookingRow } from "@/services/bookings/types";

export const GANTT_LIVE_BOOKING_EVENT = "gantt:live-booking";
export const GANTT_REMOVE_BOOKING_EVENT = "gantt:remove-booking";
export const GANTT_LIVE_SEGMENT_EVENT = "gantt:live-segment";
export const GANTT_REMOVE_SEGMENT_EVENT = "gantt:remove-segment";

type GanttLiveBookingDetail = { booking: BookingRow };
type GanttRemoveBookingDetail = { bookingId: string };
type GanttLiveSegmentDetail = { segment: OccupancySegment };
type GanttRemoveSegmentDetail = { segmentId: string };

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

export function publishGanttHoldOrBlock(input: {
  ids: string[];
  kind: "hold" | "block";
  roomIds: string[];
  checkIn: string;
  checkOut: string;
  reason?: string | null;
  today: string;
}) {
  input.ids.forEach((id, index) => {
    const roomId = input.roomIds[index] ?? input.roomIds[0];
    if (!roomId) return;
    publishGanttLiveSegment({
      id,
      kind: input.kind,
      roomId,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      phase: occupancyPhase(input.checkIn, input.checkOut, input.today),
      reason: input.reason ?? null,
    });
  });
}

export function publishGanttLiveSegment(segment: OccupancySegment) {
  window.dispatchEvent(
    new CustomEvent<GanttLiveSegmentDetail>(GANTT_LIVE_SEGMENT_EVENT, {
      detail: { segment },
    }),
  );
}

export function removeGanttLiveSegment(segmentId: string) {
  window.dispatchEvent(
    new CustomEvent<GanttRemoveSegmentDetail>(GANTT_REMOVE_SEGMENT_EVENT, {
      detail: { segmentId },
    }),
  );
}

/**
 * Do not router.refresh() after Gantt mutations.
 * Full-page refresh races after() cache bust and wipes optimistic bars.
 */
export function deferGanttBackgroundRefresh(
  _router?: { refresh: () => void },
  _delayMs = 5000,
) {}

export function useGanttLiveBookings(serverBookings: BookingRow[]): BookingRow[] {
  return useGanttLiveCalendar(serverBookings, [], "").bookings;
}

export function useGanttLiveCalendar(
  serverBookings: BookingRow[],
  serverOccupancy: OccupancySegment[],
  today: string,
): { bookings: BookingRow[]; occupancy: OccupancySegment[] } {
  const [overlays, setOverlays] = useState<Map<string, BookingRow>>(
    () => new Map(),
  );
  const [removedIds, setRemovedIds] = useState<Set<string>>(() => new Set());
  const [extraSegments, setExtraSegments] = useState<OccupancySegment[]>([]);
  const [removedSegmentIds, setRemovedSegmentIds] = useState<Set<string>>(
    () => new Set(),
  );

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

  const onLiveSegment = useCallback((event: Event) => {
    const detail = (event as CustomEvent<GanttLiveSegmentDetail>).detail;
    if (!detail?.segment?.id) return;
    setExtraSegments((prev) => {
      const next = prev.filter((segment) => segment.id !== detail.segment.id);
      next.push(detail.segment);
      return next;
    });
    setRemovedSegmentIds((prev) => {
      if (!prev.has(detail.segment.id)) return prev;
      const next = new Set(prev);
      next.delete(detail.segment.id);
      return next;
    });
  }, []);

  const onRemoveSegment = useCallback((event: Event) => {
    const detail = (event as CustomEvent<GanttRemoveSegmentDetail>).detail;
    if (!detail?.segmentId) return;
    setRemovedSegmentIds((prev) => {
      const next = new Set(prev);
      next.add(detail.segmentId);
      return next;
    });
    setExtraSegments((prev) => prev.filter((segment) => segment.id !== detail.segmentId));
  }, []);

  useEffect(() => {
    window.addEventListener(GANTT_LIVE_BOOKING_EVENT, onLiveBooking);
    window.addEventListener(GANTT_REMOVE_BOOKING_EVENT, onRemoveBooking);
    window.addEventListener(GANTT_LIVE_SEGMENT_EVENT, onLiveSegment);
    window.addEventListener(GANTT_REMOVE_SEGMENT_EVENT, onRemoveSegment);
    return () => {
      window.removeEventListener(GANTT_LIVE_BOOKING_EVENT, onLiveBooking);
      window.removeEventListener(GANTT_REMOVE_BOOKING_EVENT, onRemoveBooking);
      window.removeEventListener(GANTT_LIVE_SEGMENT_EVENT, onLiveSegment);
      window.removeEventListener(GANTT_REMOVE_SEGMENT_EVENT, onRemoveSegment);
    };
  }, [onLiveBooking, onRemoveBooking, onLiveSegment, onRemoveSegment]);

  useEffect(() => {
    const serverIds = new Set(serverBookings.map((booking) => booking.id));
    setOverlays((prev) => {
      if (prev.size === 0) return prev;
      const serverById = new Map(serverBookings.map((booking) => [booking.id, booking]));
      let changed = false;
      const next = new Map(prev);
      for (const [id, overlay] of prev) {
        const server = serverById.get(id);
        if (!server) continue;
        if (
          overlay.status === server.status &&
          overlay.check_in === server.check_in &&
          overlay.check_out === server.check_out &&
          overlay.room_ids.join(",") === server.room_ids.join(",")
        ) {
          next.delete(id);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
    setRemovedIds((prev) => {
      if (prev.size === 0) return prev;
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

  useEffect(() => {
    const serverIds = new Set(serverOccupancy.map((segment) => segment.id));
    setExtraSegments((prev) => {
      if (prev.length === 0) return prev;
      const next = prev.filter((segment) => !serverIds.has(segment.id));
      return next.length === prev.length ? prev : next;
    });
    setRemovedSegmentIds((prev) => {
      if (prev.size === 0) return prev;
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
  }, [serverOccupancy]);

  const bookings = useMemo(
    () => mergeGanttLiveBookings(serverBookings, overlays, removedIds),
    [serverBookings, overlays, removedIds],
  );

  const occupancy = useMemo(
    () =>
      mergeGanttLiveOccupancy({
        serverOccupancy,
        serverBookings,
        overlays,
        removedBookingIds: removedIds,
        extraSegments,
        removedSegmentIds,
        today,
      }),
    [
      serverOccupancy,
      serverBookings,
      overlays,
      removedIds,
      extraSegments,
      removedSegmentIds,
      today,
    ],
  );

  return { bookings, occupancy };
}
