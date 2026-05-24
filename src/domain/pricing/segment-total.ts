import { stayNightCount } from "@/lib/stay-dates";

export type PricedSegment = {
  segment_start: string;
  segment_end: string;
  nightly_rate: number | null;
};

export function computeSegmentTotal(seg: PricedSegment): number {
  const rate = Number(seg.nightly_rate ?? 0);
  const nights = stayNightCount(seg.segment_start, seg.segment_end);
  return Math.round(rate * nights * 100) / 100;
}

export function computeBookingTotalFromSegments(segments: PricedSegment[]): number {
  const raw = segments.reduce((sum, seg) => sum + computeSegmentTotal(seg), 0);
  return Math.round(raw * 100) / 100;
}
