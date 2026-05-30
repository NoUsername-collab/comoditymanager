"use client";

import { useTranslations } from "next-intl";
import {
  GanttBuildingMarker,
  GanttRoomMarker,
} from "@/components/admin/gantt/GanttBuildingMarker";

export function GanttFooterLegend({
  checkInTime,
  checkOutTime,
}: {
  checkInTime: string;
  checkOutTime: string;
}) {
  const tCommon = useTranslations("admin.common");
  const tGantt = useTranslations("admin.gantt");
  const tLayers = useTranslations("admin.gantt.layers");

  return (
    <div className="gantt-footer-legend border-t border-zinc-100 bg-zinc-50/60 px-4 py-3 text-[11px] text-zinc-600">
      <p className="gantt-stay-hint mb-2 text-xs">
        {tGantt("footer.dragHint")} · {tGantt("footer.buildingFocusHint")} ·{" "}
        <kbd className="rounded border px-1">T</kbd> {tCommon("todayShort").toLowerCase()}
      </p>
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        <span className="inline-flex items-center gap-1.5">
          <span className="gantt-legend-swatch gantt-legend-swatch--checkout" />
          {tGantt("footer.dayDepartureUntil", { time: checkOutTime })}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="gantt-legend-swatch gantt-legend-swatch--clean" />
          {tGantt("footer.cleaning")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="gantt-legend-swatch gantt-legend-swatch--checkin" />
          {tGantt("footer.nightArrivalFrom", { time: checkInTime })}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="gantt-legend-swatch gantt-legend-swatch--weekend" />
          {tGantt("footer.weekend")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="gantt-legend-today-line" aria-hidden />
          {tCommon("todayShort")}
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="gantt-room-today-badge gantt-room-today-badge--in">
            {tCommon("arrival")}
          </span>
          <span className="gantt-room-today-badge gantt-room-today-badge--out">
            {tCommon("departure")}
          </span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <GanttBuildingMarker acMode="all_rooms" size="sm" />
          {tGantt("markers.buildingWithAc")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <GanttBuildingMarker acMode="none" size="sm" />
          {tGantt("markers.buildingWithoutAc")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <GanttRoomMarker acMode="all_rooms" size="sm" />
          {tCommon("room")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="mr-0.5 inline-block h-3 w-7 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 shadow-[inset_2px_0_0_#059669]" />
          {tLayers("confirmate")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-7 rounded-full bg-gradient-to-r from-amber-300 to-amber-400" />
          {tCommon("request")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-7 rounded-full bg-slate-300" />
          {tLayers("trecute")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-7 rounded-full bg-yellow-300" />
          {tLayers("hold")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-7 rounded-full bg-yellow-400" />
          {tLayers("block")}
        </span>
      </div>
    </div>
  );
}
