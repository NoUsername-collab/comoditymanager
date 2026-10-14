"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { previewStaffStayRoomsAction } from "@/features/bookings/staff-stay-actions";
import type { ConfirmRoomOption } from "@/services/booking-confirm";
import type { StayPricingRules } from "@/domain/settings/booking-rules";
import {
  DEFAULT_CHILD_POLICY,
  partyAgesComplete,
  type ChildPolicy,
  type Party,
} from "@/domain/availability/party";
import {
  UNLIMITED_INVENTORY,
  type SharedInventory,
} from "@/domain/availability/stay-capacity";
import {
  buildStaffStaySuggestions,
  quoteStaffStaySelection,
  resolveStaffStaySelection,
} from "@/domain/availability/staff-stay-quote";

export function useStaffStayPreview(args: {
  checkIn: string;
  checkOut: string;
  party: Party;
  preferredRoomIds: string[];
  enabled: boolean;
}) {
  const [pending, startPreview] = useTransition();
  const [rooms, setRooms] = useState<ConfirmRoomOption[]>([]);
  const [pricingRules, setPricingRules] = useState<StayPricingRules | null>(null);
  const [policy, setPolicy] = useState<ChildPolicy>(DEFAULT_CHILD_POLICY);
  const [inventory, setInventory] = useState<SharedInventory>(UNLIMITED_INVENTORY);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const preferredKey = args.preferredRoomIds.join(",");
  // The party object changes on every keystroke; compare it by value.
  const partyKey = JSON.stringify(args.party);
  const party = useMemo(() => JSON.parse(partyKey) as Party, [partyKey]);
  const agesComplete = partyAgesComplete(party);
  const intervalValid =
    Boolean(args.checkIn) &&
    Boolean(args.checkOut) &&
    args.checkIn < args.checkOut;

  useEffect(() => {
    if (!args.enabled || !intervalValid || !agesComplete) {
      setRooms([]);
      return;
    }
    const preferredIds = preferredKey ? preferredKey.split(",") : [];
    const timer = window.setTimeout(() => {
      startPreview(async () => {
        const res = await previewStaffStayRoomsAction({
          checkIn: args.checkIn,
          checkOut: args.checkOut,
          party,
        });
        if (!res.ok) {
          setError(res.error);
          setRooms([]);
          return;
        }
        setError(null);
        setRooms(res.rooms.availableRooms);
        setPricingRules(res.pricingRules);
        setPolicy(res.rooms.childPolicy);
        setInventory(res.rooms.inventory);
        setSelectedIds((prev) =>
          resolveStaffStaySelection({
            previousIds: prev,
            availableRooms: res.rooms.availableRooms,
            preferredIds,
            party,
            policy: res.rooms.childPolicy,
            inventory: res.rooms.inventory,
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
    party,
    agesComplete,
    preferredKey,
    intervalValid,
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
        party,
        policy,
        inventory,
        checkIn: args.checkIn,
        checkOut: args.checkOut,
        pricingRules,
      }),
    [rooms, selectedIds, party, policy, inventory, args.checkIn, args.checkOut, pricingRules],
  );

  const suggestions = useMemo(
    () =>
      buildStaffStaySuggestions({
        availableRooms: rooms,
        party,
        policy,
        inventory,
        preferredIds: preferredKey ? preferredKey.split(",") : [],
        checkIn: args.checkIn,
        checkOut: args.checkOut,
        pricingRules,
      }),
    [rooms, party, policy, inventory, preferredKey, args.checkIn, args.checkOut, pricingRules],
  );

  return {
    pending,
    error,
    rooms,
    agesComplete,
    selectedIds,
    toggleRoom,
    applyRooms,
    quote,
    suggestions,
  };
}
