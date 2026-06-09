import { guestFullName } from "./identity-rules";
import type {
  BookingForCheckin,
  CheckinGuestInput,
  GroupCheckinMode,
} from "./types";

/** Cine completează datele de identitate la check-in. */
export type CheckinIdentityScope = "rep" | "individual" | "per_room";

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
    document_type: null,
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

/** Construiește sloturile de formular în funcție de modul ales. */
export function buildCheckinGuestSlots(
  booking: BookingForCheckin,
  scope: CheckinIdentityScope,
): CheckinGuestInput[] {
  const rooms = bookingRooms(booking);

  if (scope === "rep") {
    return [createGuestSlot(booking, rooms[0], true)];
  }

  if (scope === "per_room") {
    return rooms.map((room, index) =>
      createGuestSlot(booking, room, index === 0),
    );
  }

  const count = Math.max(1, booking.num_adults);
  return Array.from({ length: count }, (_, index) => {
    const room = rooms[index % rooms.length];
    return createGuestSlot(booking, room, index === 0);
  });
}

/** Oaspeți pentru care se colectează / validează identitatea acum. */
export function guestsCollectingIdentity(
  guests: CheckinGuestInput[],
): CheckinGuestInput[] {
  return guests.filter((g) => g.present_at_checkin !== false);
}

/** Oaspeți care se salvează în DB la finalizare. */
export function guestsToPersist(guests: CheckinGuestInput[]): CheckinGuestInput[] {
  return guestsCollectingIdentity(guests).filter(
    (g) => Boolean(guestFullName(g).trim() || g.full_name?.trim()),
  );
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
    document_type: null,
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
