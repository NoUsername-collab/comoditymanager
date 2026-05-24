import { isAtLeastOneNight } from "@/domain/booking/conflict";
import { addDays, stayNightCount, todayIso } from "@/lib/stay-dates";

export type BookingRoomSegmentRow = {
  id: string;
  booking_id: string;
  room_id: string;
  segment_start: string;
  segment_end: string;
  nightly_rate: number | null;
};

export function resolveMovePivot(
  segmentStart: string,
  segmentEnd: string,
  requestedPivot?: string
): string {
  const today = todayIso();
  let pivot = requestedPivot && requestedPivot > today ? requestedPivot : today;
  if (pivot <= segmentStart) {
    pivot = addDays(segmentStart, 1);
  }
  if (pivot >= segmentEnd) {
    throw new Error("Nu mai rămân nopți viitoare de mutat pe acest segment.");
  }
  if (!isAtLeastOneNight(segmentStart, pivot)) {
    throw new Error("Segmentul trecut trebuie să păstreze minim o noapte.");
  }
  if (!isAtLeastOneNight(pivot, segmentEnd)) {
    throw new Error("Segmentul nou trebuie să aibă minim o noapte.");
  }
  return pivot;
}

export function segmentNightCount(seg: {
  segment_start: string;
  segment_end: string;
}): number {
  return stayNightCount(seg.segment_start, seg.segment_end);
}
