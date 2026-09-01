"use client";

import { Link } from "@/i18n/navigation";
import { useState } from "react";
import { useSearchParams } from "next/navigation"
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import type { GanttFilter, GanttFeatureFilter } from "@/domain/gantt/filters";
import type { GanttLayerFilter } from "@/domain/gantt/occupancy-layer";
import { layerFilterLabel } from "@/domain/gantt/occupancy-layer";
import type { GanttZoom } from "@/domain/gantt/view-range";
import { buildCalendarQuery } from "@/lib/gantt-query";
import { addDays, parseIso, todayIso } from "@/lib/stay-dates";
import type { BookingRow } from "@/services/bookings";
import { GanttCereriQueue } from "@/features/calendar/ui/GanttCereriQueue";
import { GanttToolbarOccForm } from "@/features/calendar/ui/GanttToolbarOccForm";
import { GanttRadialController } from "@/features/calendar/ui/GanttRadialController";
import { useIsCompactViewport } from "@/hooks/useDisplayProfile";

export type GanttViewMode = "all" | "building" | "room";

type BuildingOption = { id: string; name: string; color_hex: string | null };
type RoomOption = {
  id: string;
  name: string;
  building_id: string;
  building_name: string;
};

type SegOption<T extends string> = {
  value: T;
  label: string;
  /** Etichetă scurtă pe mobil */
  shortLabel?: string;
};

export function SegmentGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  compact,
  inline = false,
  forceShortLabels = false,
}: {
  label: string;
  options: SegOption<T>[];
  value: T;
  onChange: (v: T) => void;
  compact?: boolean;
  inline?: boolean;
  forceShortLabels?: boolean;
}) {
  return (
    <div
      className={["gantt-seg", compact && "gantt-seg--compact", inline && "gantt-seg--inline"]
        .filter(Boolean)
        .join(" ")}
      role="group"
      aria-label={label}
    >
      <span className="gantt-seg__label">{label}</span>
      <div className="gantt-seg__track">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={[
              "gantt-seg__btn",
              value === opt.value && "gantt-seg__btn--active",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-pressed={value === opt.value}
            onClick={() => onChange(opt.value)}
          >
            {opt.shortLabel ? (
              <>
                <span
                  className={[
                    "gantt-seg__btn-text gantt-seg__btn-text--short",
                    forceShortLabels && "gantt-seg__btn-text--force",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {opt.shortLabel}
                </span>
                <span
                  className={[
                    "gantt-seg__btn-text gantt-seg__btn-text--long",
                    forceShortLabels && "gantt-seg__btn-text--force-hidden",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {opt.label}
                </span>
              </>
            ) : (
              opt.label
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

export function GanttToolbar({
  year,
  month,
  zoom,
  ws,
  quarter,
  filter,
  feat = "all",
  layer = "all",
  buildings,
  rooms,
  periodTitle,
  rangeStart,
  prevHref,
  nextHref,
  bookings = [],
  cereri = [],
  today,
}: {
  year: number;
  month: number;
  zoom: GanttZoom;
  ws?: string;
  quarter?: number;
  filter: GanttFilter;
  feat?: GanttFeatureFilter;
  layer?: GanttLayerFilter;
  buildings: BuildingOption[];
  rooms: RoomOption[];
  periodTitle: string;
  rangeStart: string;
  prevHref: string;
  nextHref: string;
  bookings?: BookingRow[];
  cereri?: BookingRow[];
  today?: string;
}) {
  const tCommon = useTranslations("admin.common");
  const tLayers = useTranslations("admin.gantt.layers");
  const compactViewport = useIsCompactViewport();
  const forceShortLabels = compactViewport;
  const cereriCount = cereri.length;
  const router = useRouter();
  const searchParams = useSearchParams();
  const [occFormMode, setOccFormMode] = useState<
    "hold" | "block" | "cerere" | "direct" | "move" | null
  >(null);

  const view = (searchParams.get("view") as GanttViewMode) || "all";
  const buildingId = searchParams.get("building") ?? "";
  const roomId = searchParams.get("room") ?? "";
  const focusDay = searchParams.get("fd") ?? "";
  const effectiveToday = today ?? todayIso();
  const anchorStart = ws ?? rangeStart ?? effectiveToday;

  function push(patch: {
    y?: number;
    m?: number;
    zoom?: GanttZoom;
    ws?: string | null;
    q?: number;
    filter?: GanttFilter;
    feat?: GanttFeatureFilter;
    layer?: GanttLayerFilter;
    fd?: string | null;
    view?: GanttViewMode;
    building?: string | null;
    room?: string | null;
  }) {
    const q = buildCalendarQuery({
      y: patch.y ?? year,
      m: patch.m ?? month,
      view: patch.view ?? view,
      building:
        patch.building !== undefined
          ? patch.building ?? undefined
          : buildingId || undefined,
      room:
        patch.room !== undefined ? patch.room ?? undefined : roomId || undefined,
      zoom: patch.zoom ?? zoom,
      ws: patch.ws !== undefined ? patch.ws ?? undefined : ws,
      q: patch.q ?? quarter,
      filter: patch.filter ?? filter,
      feat: patch.feat ?? feat,
      layer: patch.layer ?? layer,
      fd:
        patch.fd !== undefined
          ? patch.fd ?? undefined
          : focusDay || undefined,
    });
    router.push(`/admin/calendar?${q}`);
  }

  function shiftGrid(days: number) {
    const nextStart = addDays(anchorStart, days);
    const nextDate = parseIso(nextStart);
    push({
      y: nextDate.getFullYear(),
      m: nextDate.getMonth(),
      ws: nextStart,
      q: zoom === "quarter" ? Math.floor(nextDate.getMonth() / 3) : undefined,
    });
  }

  const roomsForBuilding = buildingId
    ? rooms.filter((r) => r.building_id === buildingId)
    : rooms;

  const metaParts: string[] = [];
  if (filter === "free") {
    metaParts.push(
      focusDay ? tCommon("freeOnDay", { day: focusDay }) : tCommon("freeOnFocusedDay")
    );
  } else if (filter === "occupied") {
    metaParts.push(
      focusDay
        ? tCommon("occupiedOnDay", { day: focusDay })
        : tCommon("occupiedOnFocusedDay")
    );
  }
  if (feat === "ac") metaParts.push(tCommon("withAc"));
  else if (feat === "fridge") metaParts.push(tCommon("withFridge"));
  if (layer !== "all") {
    metaParts.push(
      tCommon("displayLayer", {
        layer: layerFilterLabel(layer, (key) => tLayers(key)),
      })
    );
  }
  if (view === "all") metaParts.push(`${rooms.length} camere`);
  else if (view === "building") {
    metaParts.push(
      `${roomsForBuilding.length} ${tCommon("roomsShort")} · ${buildings.find((b) => b.id === buildingId)?.name ?? ""}`
    );
  } else {
    const r = rooms.find((x) => x.id === roomId);
    metaParts.push(r ? `${r.name} · ${r.building_name}` : `1 ${tCommon("room")}`);
  }

  return (
    <div className="gantt-chrome">
      <div className="gantt-toolbar__panel">
        <div className="gantt-toolbar__row gantt-toolbar__row--radial">
          <div className="gantt-toolbar__center gantt-toolbar__center--compact">
            <GanttRadialController
              onOpenRequest={() => setOccFormMode("cerere")}
              onOpenHold={() => setOccFormMode("hold")}
              onOpenMove={() => setOccFormMode("move")}
              onOpenBlock={() => setOccFormMode("block")}
              onOpenReception={() => setOccFormMode("direct")}
            />
          </div>
        </div>

        <div className="gantt-toolbar__row gantt-toolbar__row--controls">
          <div className="gantt-toolbar__segments">
            <SegmentGroup
              label={tCommon("displayLayer", { layer: "" }).replace(/:\s*$/, "")}
              compact
              forceShortLabels={forceShortLabels}
              value={layer}
              onChange={(l) => push({ layer: l })}
              options={[
                { value: "all", label: tLayers("all"), shortLabel: tLayers("all") },
                { value: "cereri", label: tLayers("cereri"), shortLabel: tCommon("requestsShort") },
                { value: "confirmate", label: tLayers("confirmate"), shortLabel: tCommon("confirmedShort") },
                { value: "in_house", label: tLayers("in_house"), shortLabel: tCommon("inShort") },
                { value: "trecute", label: tLayers("trecute"), shortLabel: tCommon("pastShort") },
                { value: "hold", label: tLayers("hold"), shortLabel: tLayers("hold") },
                { value: "block", label: tLayers("block"), shortLabel: tCommon("blocksShort") },
              ]}
            />

            <SegmentGroup
              label={tCommon("roomsLabel")}
              compact
              forceShortLabels={forceShortLabels}
              value={filter}
              onChange={(f) =>
                push({
                  filter: f,
                  fd: f === "free" ? focusDay || null : null,
                })
              }
              options={[
                { value: "all", label: tCommon("all") },
                { value: "occupied", label: tCommon("occupied") },
                { value: "free", label: tCommon("free") },
              ]}
            />

            <SegmentGroup
              label={tCommon("options")}
              compact
              forceShortLabels={forceShortLabels}
              value={feat}
              onChange={(f) => push({ feat: f })}
              options={[
                { value: "all", label: tCommon("all") },
                { value: "ac", label: tCommon("withAc") },
                { value: "fridge", label: tCommon("fridge") },
              ]}
            />

            <SegmentGroup
              label={tCommon("view")}
              compact
              forceShortLabels={forceShortLabels}
              value={view}
              onChange={(v) => {
                if (v === "all") push({ view: "all", building: null, room: null });
                else if (v === "building")
                  push({
                    view: "building",
                    building: buildingId || buildings[0]?.id || null,
                    room: null,
                  });
                else
                  push({
                    view: "room",
                    room: roomId || rooms[0]?.id || null,
                    building: null,
                  });
              }}
              options={[
                { value: "all", label: tCommon("all") },
                { value: "building", label: tCommon("byBuilding") },
                { value: "room", label: tCommon("byRoom") },
              ]}
            />
          </div>
        </div>

        {cereriCount > 0 ? (
          <GanttCereriQueue cereri={cereri} embedded />
        ) : null}

        <div className="gantt-toolbar__row gantt-toolbar__row--nav">
          <div className="gantt-toolbar__nav-strip">
            <div className="gantt-toolbar__shifters" aria-label={tCommon("timeline")}>
              <div className="gantt-toolbar__stepper">
                <span className="gantt-toolbar__stepper-label">{tCommon("oneDay")}</span>
                <div className="gantt-toolbar__stepper-actions">
                  <button
                    type="button"
                    className="gantt-toolbar__mini-nav"
                    aria-label={tCommon("backOneDay")}
                    onClick={() => shiftGrid(-1)}
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    className="gantt-toolbar__mini-nav"
                    aria-label={tCommon("forwardOneDay")}
                    onClick={() => shiftGrid(1)}
                  >
                    →
                  </button>
                </div>
              </div>

              <div className="gantt-toolbar__stepper">
                <span className="gantt-toolbar__stepper-label">{tCommon("oneWeek")}</span>
                <div className="gantt-toolbar__stepper-actions">
                  <button
                    type="button"
                    className="gantt-toolbar__mini-nav"
                    aria-label={tCommon("backOneWeek")}
                    onClick={() => shiftGrid(-7)}
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    className="gantt-toolbar__mini-nav"
                    aria-label={tCommon("forwardOneWeek")}
                    onClick={() => shiftGrid(7)}
                  >
                    →
                  </button>
                </div>
              </div>
            </div>

            <div className="gantt-toolbar__period-shell">
              <div className="gantt-toolbar__period">
                <Link
                  href={prevHref}
                  className="gantt-toolbar__nav"
                  aria-label={tCommon("previousPeriod")}
                >
                  ←
                </Link>
                <span className="gantt-toolbar__title capitalize">{periodTitle}</span>
                <Link
                  href={nextHref}
                  className="gantt-toolbar__nav"
                  aria-label={tCommon("nextPeriod")}
                >
                  →
                </Link>
              </div>
              <p className="gantt-toolbar__period-hint">
                {tCommon("periodSelectorHint")}
              </p>
            </div>

            <div className="gantt-toolbar__actions gantt-toolbar__actions--nav">
              <button
                type="button"
                className="gantt-toolbar__today"
                onClick={() =>
                  window.dispatchEvent(new CustomEvent("gantt:scroll-today"))
                }
              >
                {tCommon("todayPanel")}
              </button>

              {cereriCount > 0 ? (
                <a
                  href="#gantt-cereri-queue"
                  className="gantt-toolbar__cereri-pill gantt-toolbar__cereri-pill--jump"
                  title={tCommon("jumpUnassigned")}
                >
                  <span className="gantt-toolbar__cereri-dot" aria-hidden />
                  {tCommon("requestsNoRoomCount", { count: cereriCount })}
                </a>
              ) : null}

              {view === "building" && buildings.length > 0 && (
                <select
                  value={buildingId || buildings[0]?.id || ""}
                  onChange={(e) =>
                    push({ view: "building", building: e.target.value })
                  }
                  className="gantt-toolbar__select"
                  aria-label={tCommon("buildingLabel")}
                >
                  {buildings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              )}

              {view === "room" && rooms.length > 0 && (
                <select
                  value={roomId || rooms[0]?.id || ""}
                  onChange={(e) => push({ view: "room", room: e.target.value })}
                  className="gantt-toolbar__select gantt-toolbar__select--wide"
                  aria-label={tCommon("roomLabel")}
                >
                  {buildings.map((b) => {
                    const group = rooms.filter((r) => r.building_id === b.id);
                    if (group.length === 0) return null;
                    return (
                      <optgroup key={b.id} label={b.name}>
                        {group.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </optgroup>
                    );
                  })}
                </select>
              )}
            </div>
          </div>
        </div>

        {metaParts.length > 0 && (
          <p className="gantt-toolbar__meta">{metaParts.join(" · ")}</p>
        )}

        <div className="gantt-toolbar__legend" aria-label={tCommon("legend")}>
          <span className="gantt-toolbar__legend-item">
            <span className="gantt-toolbar__legend-swatch gantt-toolbar__legend-swatch--past" />
            {tCommon("past")}
          </span>
          <span className="gantt-toolbar__legend-item">
            <span className="gantt-toolbar__legend-swatch gantt-toolbar__legend-swatch--active" />
            {tCommon("inHouse")}
          </span>
          <span className="gantt-toolbar__legend-item">
            <span className="gantt-toolbar__legend-swatch gantt-toolbar__legend-swatch--cerere" />
            {tCommon("requests").slice(0, -1)}
          </span>
          <span className="gantt-toolbar__legend-item">
            <span className="gantt-toolbar__legend-swatch gantt-toolbar__legend-swatch--hold" />
            {tCommon("holds").slice(0, -1)}
          </span>
          <span className="gantt-toolbar__legend-item">
            <span className="gantt-toolbar__legend-swatch gantt-toolbar__legend-swatch--block" />
            {tCommon("blocks").slice(0, -1)}
          </span>
          <span className="gantt-toolbar__legend-item gantt-toolbar__legend-item--hint">
            {tCommon("dragEmptyCell")}
          </span>
          {process.env.NEXT_PUBLIC_BUILD_SHA ? (
            <span
              className="gantt-toolbar__legend-item gantt-toolbar__legend-item--build"
            title={tCommon("vercelHashTitle")}
            >
              build {process.env.NEXT_PUBLIC_BUILD_SHA}
            </span>
          ) : null}
        </div>
      </div>
      <GanttToolbarOccForm
        key={occFormMode ?? "closed"}
        mode={occFormMode}
        rooms={rooms}
        bookings={bookings}
        onClose={() => setOccFormMode(null)}
      />
    </div>
  );
}
