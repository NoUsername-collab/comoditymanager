"use client";

import type { CSSProperties } from "react";
import type { AcMode } from "@/types/database";
import { GanttBuildingMarker } from "@/features/calendar/ui/GanttBuildingMarker";
import { resolveGanttAcMarkerColor } from "@/lib/gantt-ac-marker";

export type GanttBuildingChip = {
  id: string;
  name: string;
  color_hex: string | null;
  ac_mode: AcMode;
  roomCount: number;
  hasAnyRoomAc?: boolean;
};

export function GanttBuildingChips({
  buildings,
  focusBuildingId,
  onFocusBuilding,
}: {
  buildings: GanttBuildingChip[];
  focusBuildingId: string | null;
  onFocusBuilding: (id: string | null) => void;
}) {
  if (buildings.length === 0) return null;

  return (
    <div className="gantt-building-chips">
      <button
        type="button"
        onClick={() => onFocusBuilding(null)}
        className={[
          "gantt-building-chip rounded-full border-zinc-200 bg-white text-zinc-600",
          focusBuildingId === null && "gantt-building-chip--active ring-1 ring-zinc-300",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        Toate clădirile
      </button>
      {buildings.map((b) => {
        const color = resolveGanttAcMarkerColor(b.ac_mode, {
          buildingHasAnyRoomAc: b.hasAnyRoomAc,
        });
        const active = focusBuildingId === b.id;
        return (
          <button
            key={b.id}
            type="button"
            onClick={() => onFocusBuilding(active ? null : b.id)}
            className={[
              "gantt-building-chip",
              active ? "gantt-building-chip--active" : "gantt-building-chip--muted",
              focusBuildingId && !active && "opacity-70",
            ]
              .filter(Boolean)
              .join(" ")}
            style={
              {
                "--chip-color": color,
                borderColor: color,
                background: `color-mix(in srgb, ${color} 12%, white)`,
                color: `color-mix(in srgb, ${color} 75%, #18181b)`,
              } as CSSProperties
            }
          >
            <GanttBuildingMarker
              acMode={b.ac_mode}
              size="sm"
              buildingHasAnyRoomAc={b.hasAnyRoomAc}
            />
            {b.name}
            <span className="tabular-nums opacity-70">({b.roomCount})</span>
          </button>
        );
      })}
    </div>
  );
}
