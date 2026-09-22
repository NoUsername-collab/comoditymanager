"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { BookingRow } from "@/services/bookings/types";

export const STAY_CANCELLED_EVENT = "stays:cancelled";
export const STAY_PATCH_EVENT = "stays:patch";

type StayCancelledDetail = { bookingId: string };
type StayPatchDetail = { patch: Partial<BookingRow> & { id: string } };

export function publishStayCancelled(bookingId: string) {
  window.dispatchEvent(
    new CustomEvent<StayCancelledDetail>(STAY_CANCELLED_EVENT, {
      detail: { bookingId },
    }),
  );
}

export function publishStayPatch(patch: Partial<BookingRow> & { id: string }) {
  window.dispatchEvent(
    new CustomEvent<StayPatchDetail>(STAY_PATCH_EVENT, {
      detail: { patch },
    }),
  );
}

export function useLiveStays<T extends { id: string }>(serverItems: T[]): T[] {
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => new Set());
  const [patches, setPatches] = useState<Map<string, Partial<T>>>(() => new Map());

  const onCancelled = useCallback((event: Event) => {
    const detail = (event as CustomEvent<StayCancelledDetail>).detail;
    if (!detail?.bookingId) return;
    setHiddenIds((prev) => {
      const next = new Set(prev);
      next.add(detail.bookingId);
      return next;
    });
  }, []);

  const onPatch = useCallback((event: Event) => {
    const detail = (event as CustomEvent<StayPatchDetail>).detail;
    if (!detail?.patch?.id) return;
    setPatches((prev) => {
      const next = new Map(prev);
      const existing = next.get(detail.patch.id) ?? {};
      next.set(detail.patch.id, { ...existing, ...detail.patch } as Partial<T>);
      return next;
    });
  }, []);

  useEffect(() => {
    window.addEventListener(STAY_CANCELLED_EVENT, onCancelled);
    window.addEventListener(STAY_PATCH_EVENT, onPatch);
    return () => {
      window.removeEventListener(STAY_CANCELLED_EVENT, onCancelled);
      window.removeEventListener(STAY_PATCH_EVENT, onPatch);
    };
  }, [onCancelled, onPatch]);

  useEffect(() => {
    const serverIds = new Set(serverItems.map((s) => s.id));
    setHiddenIds((prev) => {
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
    setPatches((prev) => {
      if (prev.size === 0) return prev;
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
  }, [serverItems]);

  return useMemo(() => {
    return serverItems
      .filter((item) => !hiddenIds.has(item.id))
      .map((item) => {
        const patch = patches.get(item.id);
        return patch ? ({ ...item, ...patch } as T) : item;
      });
  }, [serverItems, hiddenIds, patches]);
}
