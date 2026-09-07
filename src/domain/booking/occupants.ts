export type BookingOccupantDraft = {
  roomId: string;
  guestLastName: string;
  guestFirstName: string;
  guestEmail: string;
  guestPhone: string;
  isRepresentative: boolean;
};

export type BookingOccupantRow = {
  roomId: string;
  guestId: string;
  isRepresentative: boolean;
};

export function occupantCheckinSlots(
  occupants: BookingOccupantRow[],
  rooms: { id: string; name: string }[]
): Array<{ guestId: string; roomLabel: string; isRepresentative: boolean }> {
  const nameById = new Map(rooms.map((room) => [room.id, room.name]));
  return occupants.map((occupant) => ({
    guestId: occupant.guestId,
    roomLabel: nameById.get(occupant.roomId) ?? occupant.roomId,
    isRepresentative: occupant.isRepresentative,
  }));
}
