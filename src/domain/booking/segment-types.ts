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
    throw new Error("segments.no_future_nights_to_move");
  }
  if (!isAtLeastOneNight(segmentStart, pivot)) {
    throw new Error("segments.past_segment_must_keep_min_one_night");
  }
  if (!isAtLeastOneNight(pivot, segmentEnd)) {
    throw new Error("segments.new_segment_must_have_min_one_night");
  }
  return pivot;
}

export function segmentNightCount(seg: {
  segment_start: string;
  segment_end: string;
}): number {
  return stayNightCount(seg.segment_start, seg.segment_end);
}
