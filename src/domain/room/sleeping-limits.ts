/** Baby cots that fit in a room, and the most people allowed in it. */
export type RoomSleepingLimits = {
  max_cots: number;
  /** Babies included. `null` = only the beds limit applies. */
  max_occupancy: number | null;
};

export const MAX_COTS_PER_ROOM = 4;
export const MAX_ROOM_OCCUPANCY = 30;

export function parseRoomSleepingLimits(form: { get(name: string): unknown }): RoomSleepingLimits {
  const cots = Number(form.get("max_cots") ?? 0);
  const rawOccupancy = String(form.get("max_occupancy") ?? "").trim();
  const occupancy = rawOccupancy === "" ? null : Number(rawOccupancy);
  return {
    max_cots:
      Number.isInteger(cots) ? Math.min(MAX_COTS_PER_ROOM, Math.max(0, cots)) : 0,
    max_occupancy:
      occupancy != null && Number.isInteger(occupancy) && occupancy >= 1
        ? Math.min(MAX_ROOM_OCCUPANCY, occupancy)
        : null,
  };
}
