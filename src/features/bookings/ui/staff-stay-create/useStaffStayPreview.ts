"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { previewStaffStayRoomsAction } from "@/features/bookings/staff-stay-actions";
import type { ConfirmRoomOption } from "@/services/booking-confirm";
import type { StayPricingRules } from "@/domain/settings/booking-rules";
import {
  buildStaffStaySuggestions,
  partyGuestCount,
  quoteStaffStaySelection,
  resolveStaffStaySelection,
} from "@/domain/availability/staff-stay-quote";

export function useStaffStayPreview(args: {
  checkIn: string;
  checkOut: string;
  numAdults: number;
  numChildren: number;
  preferredRoomIds: string[];
  enabled: boolean;
}) {
  const [pending, startPreview] = useTransition();
  const [rooms, setRooms] = useState<ConfirmRoomOption[]>([]);
  const [pricingRules, setPricingRules] = useState<StayPricingRules | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const preferredKey = args.preferredRoomIds.join(",");
  const guestCount = partyGuestCount(args.numAdults, args.numChildren);
  const intervalValid =
    Boolean(args.checkIn) &&
    Boolean(args.checkOut) &&
    args.checkIn < args.checkOut;

  useEffect(() => {
    if (!args.enabled || !intervalValid) {
      setRooms([]);
      return;
    }
    const preferredIds = preferredKey ? preferredKey.split(",") : [];
    const timer = window.setTimeout(() => {
      startPreview(async () => {
        const res = await previewStaffStayRoomsAction({
          checkIn: args.checkIn,
          checkOut: args.checkOut,
          numAdults: args.numAdults,
          numChildren: args.numChildren,
        });
        if (!res.ok) {
          setError(res.error);
          setRooms([]);
          return;
        }
        setError(null);
        setRooms(res.rooms.availableRooms);
        setPricingRules(res.pricingRules);
        setSelectedIds((prev) =>
          resolveStaffStaySelection({
            previousIds: prev,
            availableRooms: res.rooms.availableRooms,
            preferredIds,
            guestCount,
            checkIn: args.checkIn,
            checkOut: args.checkOut,
            pricingRules: res.pricingRules,
          }),
        );
      });
    }, 280);
    return () => window.clearTimeout(timer);
  }, [
    args.checkIn,
    args.checkOut,
    args.enabled,
    args.numAdults,
    args.numChildren,
    preferredKey,
    intervalValid,
    guestCount,
  ]);

  function toggleRoom(roomId: string) {
    setSelectedIds((prev) =>
      prev.includes(roomId) ? prev.filter((id) => id !== roomId) : [...prev, roomId],
    );
  }

  function applyRooms(roomIds: string[]) {
    setSelectedIds(roomIds);
  }

  const quote = useMemo(
    () =>
      quoteStaffStaySelection({
        availableRooms: rooms,
        selectedIds,
        guestCount,
        checkIn: args.checkIn,
        checkOut: args.checkOut,
        pricingRules,
      }),
    [rooms, selectedIds, guestCount, args.checkIn, args.checkOut, pricingRules],
  );

  const suggestions = useMemo(
    () =>
      buildStaffStaySuggestions({
        availableRooms: rooms,
        guestCount,
        preferredIds: args.preferredRoomIds,
        checkIn: args.checkIn,
        checkOut: args.checkOut,
        pricingRules,
      }),
    [rooms, guestCount, preferredKey, args.checkIn, args.checkOut, pricingRules, args.preferredRoomIds],
  );

  return {
    pending,
    error,
    rooms,
    selectedIds,
    toggleRoom,
    applyRooms,
    quote,
    suggestions,
  };
}
