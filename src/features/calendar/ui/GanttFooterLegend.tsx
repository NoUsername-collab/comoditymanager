"use client";

import { useTranslations } from "next-intl";
import {
  GanttBuildingMarker,
  GanttRoomMarker,
} from "@/features/calendar/ui/GanttBuildingMarker";

function LegendBody({
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
    <>
      <p className="gantt-stay-hint gantt-stay-hint--desktop mb-2 text-xs">
        {tGantt("footer.dragHint")} · {tGantt("footer.buildingFocusHint")} ·{" "}
        <kbd className="rounded border px-1">T</kbd> {tCommon("todayShort").toLowerCase()}
      </p>
      <p className="gantt-stay-hint gantt-stay-hint--mobile mb-2 text-xs">
        {tGantt("footer.mobileStayHint")}
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
          <span className="gantt-legend-swatch gantt-legend-swatch--stay-active" />
          {tLayers("confirmate")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="gantt-legend-swatch gantt-legend-swatch--stay-pending" />
          {tCommon("request")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="gantt-legend-swatch gantt-legend-swatch--stay-past" />
          {tLayers("trecute")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="gantt-legend-swatch gantt-legend-swatch--stay-hold" />
          {tLayers("hold")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="gantt-legend-swatch gantt-legend-swatch--stay-block" />
          {tLayers("block")}
        </span>
      </div>
    </>
  );
}

export function GanttFooterLegend({
  checkInTime,
  checkOutTime,
}: {
  checkInTime: string;
  checkOutTime: string;
}) {
  const tGantt = useTranslations("admin.gantt");

  return (
    <details className="gantt-footer-legend gantt-footer-legend--collapsible border-t border-zinc-100 bg-[var(--admin-surface-bg,var(--surface))] px-3 py-2 text-[11px] text-zinc-600">
      <summary className="gantt-footer-legend__toggle list-none text-xs font-medium text-zinc-700">
        {tGantt("legend")}
      </summary>
      <div className="gantt-footer-legend__body pt-2">
        <LegendBody checkInTime={checkInTime} checkOutTime={checkOutTime} />
      </div>
    </details>
  );
}
