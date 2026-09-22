import { occupancyPhase } from "@/domain/occupancy/phase";
import type { OccupancyKind, OccupancySegment } from "@/domain/occupancy/types";
import type { BookingRow } from "@/domain/booking/row";
import { todayIso } from "@/lib/stay-dates";

/** Visual timeline filter — see timeline-spec.md */
export type GanttLayerFilter =
  | "all"
  | "requests"
  | "confirmed"
  | "in_house"
  | "past"
  | "hold"
  | "block";

const LAYER_FROM_QUERY: Record<string, GanttLayerFilter> = {
  all: "all",
  cereri: "requests",
  requests: "requests",
  confirmate: "confirmed",
  confirmed: "confirmed",
  in_house: "in_house",
  trecute: "past",
  past: "past",
  hold: "hold",
  block: "block",
};

/** Public URL values. Default `all` is omitted from the query string. */
const LAYER_TO_QUERY: Record<GanttLayerFilter, string | null> = {
  all: null,
  requests: "cereri",
  confirmed: "confirmate",
  in_house: "in_house",
  past: "trecute",
  hold: "hold",
  block: "block",
};

export function parseGanttLayerFilter(raw: string | undefined): GanttLayerFilter {
  if (!raw) return "all";
  return LAYER_FROM_QUERY[raw] ?? "all";
}

export function ganttLayerQueryValue(layer: GanttLayerFilter): string | null {
  return LAYER_TO_QUERY[layer];
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
    case "requests":
      return "Requests";
    case "confirmed":
      return "Confirmed";
    case "in_house":
      return "In-house";
    case "past":
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
    case "requests":
      return seg.kind === "request";
    case "confirmed":
      return seg.kind === "stay" && phase === "future";
    case "in_house":
      return seg.kind === "stay" && phase === "active";
    case "past":
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
    case "requests":
      return kind === "request";
    case "confirmed":
      return kind === "stay" && phase === "future";
    case "in_house":
      return kind === "stay" && phase === "active";
    case "past":
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

/** Hold/block overlays only — no duplicate stay bars. */
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

/** Stay/request segments for a room row (split-card Phase 5). */
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
