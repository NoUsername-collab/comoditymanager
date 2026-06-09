"use client";

import { GanttPeriodJumpControl } from "@/components/admin/gantt/GanttPeriodJumpControl";
import { GanttRadialController } from "@/components/admin/gantt/GanttRadialController";
import { HudIconGrid } from "@/components/admin/AdminHudIcons";
import {
  ToolbarFilterIcon,
  type InlineZoomChoice,
} from "@/components/admin/gantt/GanttGridHelpers";
import type { GanttLayerFilter } from "@/domain/gantt/occupancy-layer";
import type { GanttCalendarPatch } from "@/hooks/useGanttCalendarNavigation";
import { useTranslations } from "next-intl";

export function GanttCompactToolbar({
  onOpenRequest,
  onOpenHold,
  onOpenMove,
  onOpenBlock,
  onOpenReception,
  onOpenCheckIn,
  onOpenCheckOut,
  cereriCount,
  arrivalsCount,
  departuresCount,
  cleanCount,
  zoomChoice,
  onZoomChange,
  periodTitle,
  firstIso,
  onPrevPeriod,
  onNextPeriod,
  onJumpToDate,
  prevPeriodAria,
  nextPeriodAria,
  jumpAria,
  isTodayStartMode,
  onToggleTodayStartMode,
  layerFilter,
  onCalendarPatch,
  isAvailabilityPanelOpen,
  onToggleAvailabilityPanel,
  isFiltersOpen,
  hasActiveFilters,
  onToggleFilters,
}: {
  onOpenRequest: () => void;
  onOpenHold: () => void;
  onOpenMove: () => void;
  onOpenBlock: () => void;
  onOpenReception: () => void;
  onOpenCheckIn?: () => void;
  onOpenCheckOut: () => void;
  cereriCount: number;
  arrivalsCount: number;
  departuresCount: number;
  cleanCount: number;
  zoomChoice: InlineZoomChoice;
  onZoomChange: (nextZoom: InlineZoomChoice) => void;
  periodTitle: string;
  firstIso: string;
  onPrevPeriod: () => void;
  onNextPeriod: () => void;
  onJumpToDate: (iso: string) => void;
  prevPeriodAria: string;
  nextPeriodAria: string;
  jumpAria: string;
  isTodayStartMode: boolean;
  onToggleTodayStartMode: () => void;
  layerFilter: GanttLayerFilter;
  onCalendarPatch: (patch: GanttCalendarPatch) => void;
  isAvailabilityPanelOpen: boolean;
  onToggleAvailabilityPanel: () => void;
  isFiltersOpen: boolean;
  hasActiveFilters: boolean;
  onToggleFilters: (anchorRect: DOMRect) => void;
}) {
  const tCommon = useTranslations("admin.common");
  const tLayers = useTranslations("admin.gantt.layers");

  return (
    <div className="gantt-compact-toolbar mx-3">
      <div className="gantt-compact-toolbar__left">
        <GanttRadialController
          onOpenRequest={onOpenRequest}
          onOpenHold={onOpenHold}
          onOpenMove={onOpenMove}
          onOpenBlock={onOpenBlock}
          onOpenReception={onOpenReception}
          onOpenCheckIn={onOpenCheckIn}
          onOpenCheckOut={onOpenCheckOut}
          cereriCount={cereriCount}
          arrivalsCount={arrivalsCount}
          departuresCount={departuresCount}
          cleanCount={cleanCount}
        />
      </div>

      <div className="gantt-compact-toolbar__center">
        <div className="gantt-compact-toolbar__dropdown-wrap">
          <select
            className="gantt-compact-toolbar__select"
            value={zoomChoice}
            onChange={(e) => onZoomChange(e.target.value as InlineZoomChoice)}
            aria-label={tCommon("interval")}
          >
            <option value="today">{tCommon("todayShort")}</option>
            <option value="days7">{tCommon("sevenDaysShort")}</option>
            <option value="days15">{tCommon("fifteenDaysShort")}</option>
            <option value="days30">{tCommon("thirtyDaysShort")}</option>
            <option value="quarter">{tCommon("quarterShort")}</option>
          </select>
        </div>

        <GanttPeriodJumpControl
          title={periodTitle}
          valueIso={firstIso}
          onPrev={onPrevPeriod}
          onNext={onNextPeriod}
          onJump={onJumpToDate}
          prevAria={prevPeriodAria}
          nextAria={nextPeriodAria}
          jumpAria={jumpAria}
        />

        <button
          type="button"
          className={`gantt-compact-toolbar__today-btn ${isTodayStartMode ? "gantt-compact-toolbar__today-btn--active" : ""}`}
          onClick={onToggleTodayStartMode}
          title={tCommon("alignToday")}
        >
          {tCommon("todayShort")}
        </button>
      </div>

      <div className="gantt-compact-toolbar__right">
        <div className="gantt-compact-toolbar__dropdown-wrap">
          <select
            className="gantt-compact-toolbar__select"
            value={layerFilter}
            onChange={(e) => onCalendarPatch({ layer: e.target.value as GanttLayerFilter })}
            aria-label={tCommon("display")}
          >
            <option value="all">{tLayers("all")}</option>
            <option value="cereri">{tLayers("cereri")}</option>
            <option value="confirmate">{tLayers("confirmate")}</option>
            <option value="in_house">{tLayers("in_house")}</option>
            <option value="trecute">{tLayers("trecute")}</option>
            <option value="hold">{tLayers("hold")}</option>
            <option value="block">{tLayers("block")}</option>
          </select>
        </div>

        <button
          type="button"
          className={`gantt-compact-toolbar__icon-btn ${isAvailabilityPanelOpen ? "gantt-compact-toolbar__icon-btn--active" : ""}`}
          onClick={onToggleAvailabilityPanel}
          aria-label={tCommon("heatmap")}
          title={tCommon("openHeatmapFloating")}
        >
          <HudIconGrid className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          className={`gantt-compact-toolbar__icon-btn ${(isFiltersOpen || hasActiveFilters) ? "gantt-compact-toolbar__icon-btn--active" : ""}`}
          onClick={(event) => onToggleFilters(event.currentTarget.getBoundingClientRect())}
          aria-label={tCommon("filters")}
          title={tCommon("roomsAndOptions")}
        >
          <ToolbarFilterIcon className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
