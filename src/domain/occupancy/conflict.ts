import { rangesOverlap } from "@/domain/booking/conflict";
import type {
  OccupancyConflict,
  OccupancySegment,
} from "@/domain/occupancy/types";

export type OccupancyExclude = {
  bookingId?: string;
  holdId?: string;
  blockId?: string;
  segmentId?: string;
};

function segmentExcluded(seg: OccupancySegment, exclude?: OccupancyExclude): boolean {
  if (!exclude) return false;
  if (exclude.bookingId && seg.bookingId === exclude.bookingId) return true;
  if (exclude.holdId && seg.kind === "hold" && seg.id === exclude.holdId) return true;
  if (exclude.blockId && seg.kind === "block" && seg.id === exclude.blockId) return true;
  if (exclude.segmentId && seg.id === exclude.segmentId) return true;
  return false;
}

/** Conflicte pentru camere pe interval — folosește aceleași reguli turnover ca bookings. */
export function findOccupancyConflicts(
  roomIds: string[],
  checkIn: string,
  checkOut: string,
  segments: OccupancySegment[],
  exclude?: OccupancyExclude,
  times?: { checkIn: string; checkOut: string }
): OccupancyConflict[] {
  const unique = [...new Set(roomIds.filter(Boolean))];
  const proposed = { checkIn, checkOut };
  const conflicts: OccupancyConflict[] = [];

  for (const roomId of unique) {
    for (const seg of segments) {
      if (seg.roomId !== roomId) continue;
      if (segmentExcluded(seg, exclude)) continue;
      if (
        rangesOverlap(
          proposed,
          { checkIn: seg.checkIn, checkOut: seg.checkOut },
          times?.checkIn,
          times?.checkOut
        )
      ) {
        conflicts.push({ segment: seg, roomId });
      }
    }
  }

  return conflicts;
}

export function hasOccupancyConflict(
  roomIds: string[],
  checkIn: string,
  checkOut: string,
  segments: OccupancySegment[],
  exclude?: OccupancyExclude,
  times?: { checkIn: string; checkOut: string }
): boolean {
  return (
    findOccupancyConflicts(roomIds, checkIn, checkOut, segments, exclude, times)
      .length > 0
  );
}
