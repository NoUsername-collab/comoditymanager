import { guestFullName } from "./identity-rules";
import type {
  BookingForCheckin,
  CheckinGuestInput,
  CheckinIdentityScope,
  CheckinIdsPerRoom,
  GroupCheckinMode,
} from "./types";

export type { CheckinIdentityScope };

export function allowsOperatorScopeChoice(mode: GroupCheckinMode): boolean {
  return mode === "both";
}

export function effectiveIdentityScope(
  mode: GroupCheckinMode,
  operatorChoice: CheckinIdentityScope | null,
): CheckinIdentityScope {
  if (mode === "both") return operatorChoice ?? "rep";
  if (mode === "rep" || mode === "individual" || mode === "per_room") {
    return mode;
  }
  return "rep";
}

export function bookingRooms(booking: BookingForCheckin): string[] {
  const names = booking.room_names?.map((n) => n.trim()).filter(Boolean) ?? [];
  return names.length > 0 ? names : ["—"];
}

function createGuestSlot(
  booking: BookingForCheckin,
  roomLabel: string,
  isRepresentative: boolean,
): CheckinGuestInput {
  const lastName = isRepresentative ? (booking.guest_last_name ?? "") : "";
  const firstName = isRepresentative ? (booking.guest_first_name ?? "") : "";
  const fullName =
    isRepresentative && (lastName || firstName)
      ? `${lastName} ${firstName}`.trim()
      : isRepresentative
        ? booking.guest_name
        : "";

  return {
    full_name: fullName,
    last_name: lastName,
    first_name: firstName,
    phone: isRepresentative ? (booking.guest_phone ?? "") : "",
    national_id: "",
    national_id_type: "cnp",
    document_type: "ci",
    document_series: "",
    document_number: "",
    nationality: "România",
    birth_date: null,
    room_label: roomLabel,
    is_representative: isRepresentative,
    guest_id: null,
    present_at_checkin: true,
  };
}

/** Cameră primită fără identitate — ocupantul o preia la sosire. */
export function createKeysOnlyRoomSlot(
  booking: BookingForCheckin,
  roomLabel: string,
): CheckinGuestInput {
  return {
    full_name: "",
    last_name: "",
    first_name: "",
    phone: "",
    national_id: "",
    national_id_type: "cnp",
    document_type: "ci",
    document_series: "",
    document_number: "",
    nationality: "România",
    birth_date: null,
    room_label: roomLabel,
    is_representative: false,
    guest_id: null,
    present_at_checkin: false,
    keys_only: true,
  };
}

export interface IdsPerRoomConfig {
  rule: CheckinIdsPerRoom;
  familyRooms?: string[];
}

/** Sloturi pentru camerele selectate la sosire incrementală. */
export function buildCheckinGuestSlotsForRooms(
  booking: BookingForCheckin,
  roomLabels: string[],
  scope: CheckinIdentityScope = "per_room",
  idsPerRoom?: IdsPerRoomConfig,
): CheckinGuestInput[] {
  const registered = booking.registered_guests ?? [];
  if (!roomLabels.length) {
    return buildCheckinGuestSlots(booking, scope, idsPerRoom);
  }

  if (scope === "rep") {
    if (registered.length > 0) {
      const rep =
        registered.find((g) => g.is_representative) ?? registered[0];
      return [{ ...rep, room_label: roomLabels[0], is_representative: true }];
    }
    return [createGuestSlot(booking, roomLabels[0], true)];
  }

  if (registered.length > 0) {
    return assignRegisteredGuestsToRooms(registered, roomLabels);
  }

  if (!idsPerRoom || idsPerRoom.rule === "one") {
    return roomLabels.map((room, index) =>
      index === 0
        ? createGuestSlot(booking, room, true)
        : createKeysOnlyRoomSlot(booking, room),
    );
  }

  const familySet = new Set(idsPerRoom.familyRooms ?? []);
  const slots: CheckinGuestInput[] = [];
  roomLabels.forEach((room, index) => {
    slots.push(createGuestSlot(booking, room, index === 0));
    if (!familySet.has(room)) {
      slots.push(createGuestSlot(booking, room, false));
    }
  });
  return slots;
}

/** Detect family rooms: rooms where all registered guests share the same last name. */
export function detectFamilyRooms(
  booking: BookingForCheckin,
): string[] {
  const registered = booking.registered_guests ?? [];
  if (registered.length === 0) return [];

  const byRoom = new Map<string, string[]>();
  for (const g of registered) {
    const room = g.room_label?.trim();
    if (!room) continue;
    const lastName = (g.last_name ?? g.full_name?.split(" ")[0] ?? "").trim().toLowerCase();
    if (!byRoom.has(room)) byRoom.set(room, []);
    byRoom.get(room)!.push(lastName);
  }

  const familyRooms: string[] = [];
  for (const [room, names] of byRoom) {
    if (names.length > 0 && names.every((n) => n === names[0])) {
      familyRooms.push(room);
    }
  }
  return familyRooms;
}

/**
 * Reprezentantul pe mai multe camere → un rând checkin_guests per cameră.
 * Sloturile keys_only rămân fără identitate.
 */
export function expandGuestsForPersistence(
  guests: CheckinGuestInput[],
  scope: CheckinIdentityScope,
  receptionRooms: string[],
): CheckinGuestInput[] {
  if (scope === "rep" && receptionRooms.length > 1) {
    const rep =
      guests.find((g) => g.is_representative && !g.keys_only) ??
      guests.find((g) => !g.keys_only) ??
      guests[0];
    if (!rep) return guests;
    return receptionRooms.map((room, index) => ({
      ...rep,
      room_label: room,
      is_representative: index === 0,
      keys_only: false,
      present_at_checkin: true,
    }));
  }

  return guests.map((g) =>
    g.keys_only
      ? { ...g, full_name: g.full_name?.trim() || "—" }
      : g,
  );
}

/** Un client înregistrat per cameră (fără sloturi goale). */
export function assignRegisteredGuestsToRooms(
  registered: CheckinGuestInput[],
  roomLabels: string[],
): CheckinGuestInput[] {
  const assigned: CheckinGuestInput[] = [];
  roomLabels.forEach((room, index) => {
    const guest = registered[index];
    if (!guest) return;
    assigned.push({
      ...guest,
      room_label: room,
      is_representative: guest.is_representative || index === 0,
    });
  });
  return assigned;
}

/** Construiește sloturile de formular în funcție de modul ales. */
export function buildCheckinGuestSlots(
  booking: BookingForCheckin,
  scope: CheckinIdentityScope,
  idsPerRoom?: IdsPerRoomConfig,
): CheckinGuestInput[] {
  const rooms = bookingRooms(booking);

  if (scope === "rep") {
    return [createGuestSlot(booking, rooms[0], true)];
  }

  if (scope === "per_room") {
    const needsTwo = idsPerRoom?.rule === "two_non_family";
    const familySet = new Set(idsPerRoom?.familyRooms ?? []);
    const slots: CheckinGuestInput[] = [];
    rooms.forEach((room, index) => {
      slots.push(createGuestSlot(booking, room, index === 0));
      if (needsTwo && !familySet.has(room)) {
        slots.push(createGuestSlot(booking, room, false));
      }
    });
    return slots;
  }

  const count = Math.max(1, booking.num_adults);
  return Array.from({ length: count }, (_, index) => {
    const room = rooms[index % rooms.length];
    return createGuestSlot(booking, room, index === 0);
  });
}

/** Camere / oaspeți primiți în sesiunea curentă (inclusiv doar chei). */
export function guestsReceivingRooms(
  guests: CheckinGuestInput[],
): CheckinGuestInput[] {
  return guests.filter(
    (g) => g.keys_only || g.present_at_checkin !== false,
  );
}

/** Oaspeți pentru care se colectează / validează identitatea acum. */
export function guestsCollectingIdentity(
  guests: CheckinGuestInput[],
): CheckinGuestInput[] {
  return guests.filter(
    (g) => g.present_at_checkin !== false && !g.keys_only,
  );
}

/** Oaspeți care se salvează în DB la finalizare. */
export function guestsToPersist(guests: CheckinGuestInput[]): CheckinGuestInput[] {
  return guests.filter((g) => {
    if (g.keys_only && g.room_label?.trim()) return true;
    if (g.present_at_checkin === false) return false;
    return Boolean(guestFullName(g).trim() || g.full_name?.trim());
  });
}

export function resolveReceptionRoomLabels(
  booking: BookingForCheckin,
  guests: CheckinGuestInput[],
  receptionRooms?: string[],
): string[] {
  if (receptionRooms?.length) {
    return [...new Set(receptionRooms.map((r) => r.trim()).filter(Boolean))];
  }
  const fromGuests = [
    ...new Set(
      guestsReceivingRooms(guests)
        .map((g) => g.room_label?.trim())
        .filter((r): r is string => Boolean(r)),
    ),
  ];
  if (fromGuests.length) return fromGuests;
  return bookingRooms(booking);
}

export type RoomGuestGroup = {
  room: string;
  guests: { guest: CheckinGuestInput; index: number }[];
};

export function groupGuestsByRoom(guests: CheckinGuestInput[]): RoomGuestGroup[] {
  const order: string[] = [];
  const map = new Map<string, { guest: CheckinGuestInput; index: number }[]>();

  guests.forEach((guest, index) => {
    const room = guest.room_label?.trim() || "—";
    if (!map.has(room)) {
      map.set(room, []);
      order.push(room);
    }
    map.get(room)!.push({ guest, index });
  });

  return order.map((room) => ({
    room,
    guests: map.get(room) ?? [],
  }));
}

export function defaultOperatorScope(mode: GroupCheckinMode): CheckinIdentityScope {
  return effectiveIdentityScope(mode, null);
}

/** Slot gol pentru adăugare manuală (mod individual). */
export function createEmptyGuestSlot(roomLabel: string): CheckinGuestInput {
  return {
    full_name: "",
    last_name: "",
    first_name: "",
    phone: "",
    national_id: "",
    national_id_type: "cnp",
    document_type: "ci",
    document_series: "",
    document_number: "",
    nationality: "România",
    birth_date: null,
    room_label: roomLabel,
    is_representative: false,
    guest_id: null,
    present_at_checkin: true,
  };
}
