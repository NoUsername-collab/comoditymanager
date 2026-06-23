import { occupancyPhase } from "@/domain/occupancy/phase";
import type { OccupancyKind, OccupancySegment } from "@/domain/occupancy/types";
import type { BookingRow } from "@/domain/booking/row";
import { todayIso } from "@/lib/stay-dates";

/** Filtru vizual timeline — spec timeline-spec.md */
export type GanttLayerFilter =
  | "all"
  | "cereri"
  | "confirmate"
  | "in_house"
  | "trecute"
  | "hold"
  | "block";

export function parseGanttLayerFilter(raw: string | undefined): GanttLayerFilter {
  const allowed: GanttLayerFilter[] = [
    "all",
    "cereri",
    "confirmate",
    "in_house",
    "trecute",
    "hold",
    "block",
  ];
  if (raw && allowed.includes(raw as GanttLayerFilter)) {
    return raw as GanttLayerFilter;
  }
  return "all";
}

type LayerFilterTranslator = (key: GanttLayerFilter) => string;

export function layerFilterLabel(
  layer: GanttLayerFilter,
  t?: LayerFilterTranslator
): string {
  if (t) return t(layer);
  switch (layer) {
    case "all":
      return "All";
    case "cereri":
      return "Requests";
    case "confirmate":
      return "Confirmed";
    case "in_house":
      return "In-house";
    case "trecute":
      return "Past";
    case "hold":
      return "Hold";
    case "block":
      return "Blocks";
    default:
      return "All";
  }
}

function segmentPhase(seg: OccupancySegment, ref = todayIso()): string {
  return seg.phase ?? occupancyPhase(seg.checkIn, seg.checkOut, ref);
}

export function segmentMatchesLayerFilter(
  seg: OccupancySegment,
  layer: GanttLayerFilter,
  ref = todayIso()
): boolean {
  if (layer === "all") return true;
  const phase = segmentPhase(seg, ref);

  switch (layer) {
    case "cereri":
      return seg.kind === "request";
    case "confirmate":
      return seg.kind === "stay" && phase === "future";
    case "in_house":
      return seg.kind === "stay" && phase === "active";
    case "trecute":
      return (seg.kind === "request" || seg.kind === "stay") && phase === "past";
    case "hold":
      return seg.kind === "hold";
    case "block":
      return seg.kind === "block";
    default:
      return true;
  }
}

export function bookingMatchesLayerFilter(
  b: BookingRow,
  layer: GanttLayerFilter,
  ref = todayIso()
): boolean {
  if (layer === "all") return true;
  if (layer === "hold" || layer === "block") return false;

  const kind: OccupancyKind =
    b.status === "confirmata" ? "stay" : "request";
  const phase = occupancyPhase(b.check_in, b.check_out, ref);

  switch (layer) {
    case "cereri":
      return kind === "request";
    case "confirmate":
      return kind === "stay" && phase === "future";
    case "in_house":
      return kind === "stay" && phase === "active";
    case "trecute":
      return phase === "past";
    default:
      return true;
  }
}

export function filterOccupancyForLayer(
  segments: OccupancySegment[],
  layer: GanttLayerFilter,
  ref?: string
): OccupancySegment[] {
  if (layer === "all") return segments;
  return segments.filter((s) => segmentMatchesLayerFilter(s, layer, ref));
}

/** Hold/block overlays only — fără duplicate stay bars. */
export function roomOverlaySegments(
  segments: OccupancySegment[],
  roomId: string,
  layer: GanttLayerFilter
): OccupancySegment[] {
  return filterOccupancyForLayer(segments, layer).filter(
    (s) =>
      s.roomId === roomId &&
      (s.kind === "hold" || s.kind === "block")
  );
}

/** Stay/request segments pentru rând cameră (split-card Phase 5). */
export function roomStaySegments(
  segments: OccupancySegment[],
  roomId: string,
  layer: GanttLayerFilter
): OccupancySegment[] {
  return filterOccupancyForLayer(segments, layer).filter(
    (s) =>
      s.roomId === roomId &&
      (s.kind === "request" || s.kind === "stay") &&
      s.bookingId
  );
}
