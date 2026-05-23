import type { OccupancyWindow } from "@/services/building-dashboard";

export const AC_LABELS: Record<string, string> = {
  all_rooms: "AC în toată clădirea",
  none: "Fără AC",
  per_room: "AC opțional per cameră",
};

export type RoomTonightStatus = "free" | "occupied" | "pending" | "inactive";

export const ROOM_STATUS = {
  free: {
    label: "Liberă diseară",
    pill: "bg-white text-emerald-800 ring-1 ring-emerald-200",
  },
  occupied: {
    label: "Ocupată diseară",
    pill: "status-occupied-pill ring-0",
  },
  pending: {
    label: "Cerere alocată",
    pill: "bg-amber-100 text-amber-900 ring-1 ring-amber-200",
  },
  inactive: {
    label: "Inactivă",
    pill: "bg-zinc-100 text-zinc-500 ring-1 ring-zinc-200",
  },
} as const satisfies Record<
  RoomTonightStatus,
  { label: string; pill: string }
>;

export function occupancyCaption(
  pct: number,
  opts?: { freeTonight?: number; tonight?: boolean }
): string {
  if (opts?.tonight && opts.freeTonight != null) {
    if (pct === 0) return `${opts.freeTonight} libere`;
    if (opts.freeTonight === 0) return "Complet ocupat";
    return `${opts.freeTonight} libere · ${pct}% ocupat`;
  }
  if (pct === 0) return "Disponibil";
  if (pct >= 85) return "Aproape plin";
  return `${pct}% rezervat`;
}

export function occupancyCaptionFromWindow(
  w: OccupancyWindow,
  tonight?: boolean
): string {
  return occupancyCaption(w.occupancy_pct, {
    tonight,
    freeTonight: w.free_rooms_tonight,
  });
}

export const btnPrimary =
  "rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-zinc-800";

export const btnSecondary =
  "rounded-xl border border-zinc-200 bg-white px-5 py-2.5 text-sm font-medium text-zinc-800 shadow-sm hover:border-zinc-300";
