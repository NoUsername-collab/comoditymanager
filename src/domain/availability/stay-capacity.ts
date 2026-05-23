export type RoomCapacity = {
  capacity_base: number;
  allows_extra_beds: boolean;
  max_extra_beds_per_room: number;
};

export function roomMaxCapacity(room: RoomCapacity): number {
  return (
    room.capacity_base +
    (room.allows_extra_beds ? room.max_extra_beds_per_room : 0)
  );
}

/** Minim camere din lista dată pentru a găzdui toți oaspeții (capacități descrescător). */
export function minRoomsToHostGuests(
  guestCount: number,
  rooms: RoomCapacity[]
): { possible: boolean; minRooms: number } {
  if (guestCount <= 0) return { possible: true, minRooms: 0 };
  if (rooms.length === 0) return { possible: false, minRooms: 0 };

  const caps = rooms.map(roomMaxCapacity).sort((a, b) => b - a);
  let remaining = guestCount;
  let used = 0;

  for (const cap of caps) {
    if (remaining <= 0) break;
    remaining -= cap;
    used += 1;
  }

  return { possible: remaining <= 0, minRooms: used };
}

export function totalCapacityOfRooms(rooms: RoomCapacity[]): number {
  return rooms.reduce((sum, r) => sum + roomMaxCapacity(r), 0);
}

export function canRoomsHostGuests(
  guestCount: number,
  rooms: RoomCapacity[]
): boolean {
  return minRoomsToHostGuests(guestCount, rooms).possible;
}
