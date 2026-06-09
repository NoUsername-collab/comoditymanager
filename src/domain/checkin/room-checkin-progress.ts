/** Progres check-in per cameră — o rezervare poate fi recepționată în mai multe etape. */

export type RoomCheckinProgress = {
  total: number;
  checked: number;
  remaining: number;
  roomNames: string[];
  checkedRooms: string[];
  pendingRooms: string[];
  isMultiRoom: boolean;
  isPartial: boolean;
  isComplete: boolean;
};

export function normalizeRoomLabel(label: string): string {
  return label.trim().toLowerCase();
}

export function roomLabelsMatch(a: string, b: string): boolean {
  return normalizeRoomLabel(a) === normalizeRoomLabel(b);
}

export function isRoomCheckedIn(
  roomName: string,
  checkedInRooms: string[],
): boolean {
  return checkedInRooms.some((checked) => roomLabelsMatch(checked, roomName));
}

/** Camere distincte din rezervare (fără placeholder „—”). */
export function bookingRoomNames(roomNames: string[] | undefined): string[] {
  const names =
    roomNames?.map((n) => n.trim()).filter((n) => n && n !== "—") ?? [];
  return names.length > 0 ? [...new Set(names)] : [];
}

export function computeRoomCheckinProgress(
  roomNames: string[] | undefined,
  checkedInRooms: string[] | undefined,
): RoomCheckinProgress {
  const rooms = bookingRoomNames(roomNames);
  const checkedRaw =
    checkedInRooms?.map((r) => r.trim()).filter(Boolean) ?? [];

  if (rooms.length === 0) {
    const hasAny = checkedRaw.length > 0;
    return {
      total: 1,
      checked: hasAny ? 1 : 0,
      remaining: hasAny ? 0 : 1,
      roomNames: [],
      checkedRooms: checkedRaw,
      pendingRooms: hasAny ? [] : ["—"],
      isMultiRoom: false,
      isPartial: false,
      isComplete: hasAny,
    };
  }

  const pendingRooms = rooms.filter(
    (room) => !checkedRaw.some((checked) => roomLabelsMatch(checked, room)),
  );
  const checkedRooms = rooms.filter((room) =>
    checkedRaw.some((checked) => roomLabelsMatch(checked, room)),
  );

  const total = rooms.length;
  const checked = checkedRooms.length;

  return {
    total,
    checked,
    remaining: pendingRooms.length,
    roomNames: rooms,
    checkedRooms,
    pendingRooms,
    isMultiRoom: total > 1,
    isPartial: checked > 0 && checked < total,
    isComplete: checked >= total,
  };
}
