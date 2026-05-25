"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { GanttFilter, GanttFeatureFilter } from "@/domain/gantt/filters";
import type { GanttLayerFilter } from "@/domain/gantt/occupancy-layer";
import { layerFilterLabel } from "@/domain/gantt/occupancy-layer";
import type { GanttZoom } from "@/domain/gantt/view-range";
import { buildCalendarQuery } from "@/lib/gantt-query";
import { todayIso } from "@/lib/stay-dates";
import type { BookingRow } from "@/services/bookings";
import { GanttCereriQueue } from "@/components/admin/gantt/GanttCereriQueue";
import { GanttToolbarOccForm } from "@/components/admin/gantt/GanttToolbarOccForm";
import { GanttRadialController } from "@/components/admin/gantt/GanttRadialController";

export type GanttViewMode = "all" | "building" | "room";
type ZoomChoice = "today" | "days7" | "days15" | "days30" | "quarter";

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

function normalizeZoomChoice(zoom: GanttZoom): ZoomChoice {
  if (zoom === "week") return "days7";
  if (zoom === "month") return "days30";
  if (zoom === "today" || zoom === "days7" || zoom === "days15" || zoom === "days30") {
    return zoom;
  }
  return "quarter";
}

function SegmentGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  compact,
}: {
  label: string;
  options: SegOption<T>[];
  value: T;
  onChange: (v: T) => void;
  compact?: boolean;
}) {
  return (
    <div
      className={["gantt-seg", compact && "gantt-seg--compact"]
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
                <span className="gantt-seg__btn-text gantt-seg__btn-text--short">
                  {opt.shortLabel}
                </span>
                <span className="gantt-seg__btn-text gantt-seg__btn-text--long">
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
  prevHref,
  nextHref,
  cereri = [],
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
  prevHref: string;
  nextHref: string;
  cereri?: BookingRow[];
}) {
  const cereriCount = cereri.length;
  const router = useRouter();
  const searchParams = useSearchParams();
  const panelRef = useRef<HTMLDivElement>(null);
  const [occFormMode, setOccFormMode] = useState<"hold" | "block" | null>(null);

  const view = (searchParams.get("view") as GanttViewMode) || "all";
  const buildingId = searchParams.get("building") ?? "";
  const roomId = searchParams.get("room") ?? "";
  const focusDay = searchParams.get("fd") ?? "";
  const zoomChoice = useMemo(() => normalizeZoomChoice(zoom), [zoom]);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const root = document.documentElement;
    const sync = () => {
      root.style.setProperty(
        "--gantt-toolbar-height",
        `${Math.ceil(panel.getBoundingClientRect().height)}px`
      );
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(panel);
    window.addEventListener("resize", sync);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", sync);
      root.style.removeProperty("--gantt-toolbar-height");
    };
  }, []);

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

  const roomsForBuilding = buildingId
    ? rooms.filter((r) => r.building_id === buildingId)
    : rooms;

  const metaParts: string[] = [];
  if (filter === "free") {
    metaParts.push(
      focusDay ? `Libere pe ${focusDay}` : "Libere la ziua focală"
    );
  } else if (filter === "occupied") {
    metaParts.push(
      focusDay ? `Ocupate pe ${focusDay}` : "Ocupate în ziua focală"
    );
  }
  if (feat === "ac") metaParts.push("Cu AC");
  else if (feat === "fridge") metaParts.push("Cu frigider");
  if (layer !== "all") metaParts.push(`Strat: ${layerFilterLabel(layer)}`);
  if (view === "all") metaParts.push(`${rooms.length} camere`);
  else if (view === "building") {
    metaParts.push(
      `${roomsForBuilding.length} cam · ${buildings.find((b) => b.id === buildingId)?.name ?? ""}`
    );
  } else {
    const r = rooms.find((x) => x.id === roomId);
    metaParts.push(r ? `${r.name} · ${r.building_name}` : "1 cameră");
  }

  return (
    <div className="gantt-chrome">
      <div ref={panelRef} className="gantt-toolbar__panel">
        <div className="gantt-toolbar__row gantt-toolbar__row--controls">
          <div className="gantt-toolbar__period">
            <Link
              href={prevHref}
              className="gantt-toolbar__nav"
              aria-label="Perioada anterioară"
            >
              ←
            </Link>
            <span className="gantt-toolbar__title capitalize">{periodTitle}</span>
            <Link
              href={nextHref}
              className="gantt-toolbar__nav"
              aria-label="Perioada următoare"
            >
              →
            </Link>
          </div>

          <div className="gantt-toolbar__segments">
            <SegmentGroup
              label="Interval"
              compact
              value={zoomChoice}
              onChange={(z) =>
                push({
                  zoom: z,
                  ws: z === "quarter" ? null : todayIso(),
                  q:
                    z === "quarter"
                      ? quarter ?? Math.floor(month / 3)
                      : undefined,
                })
              }
              options={[
                { value: "today", label: "Azi", shortLabel: "Azi" },
                { value: "days7", label: "7 zile", shortLabel: "7z" },
                { value: "days15", label: "15 zile", shortLabel: "15z" },
                { value: "days30", label: "30 zile", shortLabel: "30z" },
                { value: "quarter", label: "Trimestru", shortLabel: "Trim." },
              ]}
            />

          <SegmentGroup
            label="Strat"
            compact
            value={layer}
            onChange={(l) => push({ layer: l })}
            options={[
              { value: "all", label: "Tot", shortLabel: "Tot" },
              { value: "cereri", label: "Cereri", shortLabel: "Cer." },
              { value: "confirmate", label: "Confirmate", shortLabel: "Conf." },
              { value: "in_house", label: "In-house", shortLabel: "In" },
              { value: "trecute", label: "Trecute", shortLabel: "Trec." },
              { value: "hold", label: "Hold", shortLabel: "Hold" },
              { value: "block", label: "Blocări", shortLabel: "Bloc" },
            ]}
          />

          <SegmentGroup
            label="Camere"
            compact
            value={filter}
            onChange={(f) =>
              push({
                filter: f,
                fd: f === "free" ? focusDay || null : null,
              })
            }
            options={[
              { value: "all", label: "Toate" },
              { value: "occupied", label: "Ocupate" },
              { value: "free", label: "Libere" },
            ]}
          />

          <SegmentGroup
            label="Opțiuni"
            compact
            value={feat}
            onChange={(f) => push({ feat: f })}
            options={[
              { value: "all", label: "Toate" },
              { value: "ac", label: "Cu AC" },
              { value: "fridge", label: "Frigider" },
            ]}
          />

            <SegmentGroup
              label="Vizualizare"
              compact
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
                { value: "all", label: "Toate" },
                { value: "building", label: "Per clădire" },
                { value: "room", label: "Per cameră" },
              ]}
            />
          </div>

          <div className="gantt-toolbar__center">
            <GanttRadialController
              onOpenHold={() => setOccFormMode("hold")}
              onOpenBlock={() => setOccFormMode("block")}
              onOpenReception={() => router.push("/receptie#receptie")}
              onScrollToToday={() =>
                window.dispatchEvent(new CustomEvent("gantt:scroll-today"))
              }
            />
          </div>

          <div className="gantt-toolbar__actions">
            {view === "building" && buildings.length > 0 && (
              <select
                value={buildingId || buildings[0]?.id || ""}
                onChange={(e) =>
                  push({ view: "building", building: e.target.value })
                }
                className="gantt-toolbar__select"
                aria-label="Clădire"
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
                aria-label="Cameră"
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

            <button
              type="button"
              className="gantt-toolbar__today"
              onClick={() =>
                window.dispatchEvent(new CustomEvent("gantt:scroll-today"))
              }
            >
              Azi în grid
            </button>

            {cereriCount > 0 ? (
              <a
                href="#gantt-cereri-queue"
                className="gantt-toolbar__cereri-pill gantt-toolbar__cereri-pill--jump"
                title="Sari la lista cererilor"
              >
                <span className="gantt-toolbar__cereri-dot" aria-hidden />
                {cereriCount} cerer{cereriCount === 1 ? "ă" : "i"}
              </a>
            ) : null}
          </div>
        </div>

        {cereriCount > 0 ? (
          <GanttCereriQueue cereri={cereri} embedded />
        ) : null}

        {metaParts.length > 0 && (
          <p className="gantt-toolbar__meta">{metaParts.join(" · ")}</p>
        )}

        <div className="gantt-toolbar__legend" aria-label="Legendă timeline">
          <span className="gantt-toolbar__legend-item">
            <span className="gantt-toolbar__legend-swatch gantt-toolbar__legend-swatch--past" />
            Trecut
          </span>
          <span className="gantt-toolbar__legend-item">
            <span className="gantt-toolbar__legend-swatch gantt-toolbar__legend-swatch--active" />
            In-house
          </span>
          <span className="gantt-toolbar__legend-item">
            <span className="gantt-toolbar__legend-swatch gantt-toolbar__legend-swatch--cerere" />
            Cerere
          </span>
          <span className="gantt-toolbar__legend-item">
            <span className="gantt-toolbar__legend-swatch gantt-toolbar__legend-swatch--hold" />
            Hold
          </span>
          <span className="gantt-toolbar__legend-item">
            <span className="gantt-toolbar__legend-swatch gantt-toolbar__legend-swatch--block" />
            Blocare
          </span>
          <span className="gantt-toolbar__legend-item gantt-toolbar__legend-item--hint">
            Trage pe celulă goală →
          </span>
          {process.env.NEXT_PUBLIC_BUILD_SHA ? (
            <span
              className="gantt-toolbar__legend-item gantt-toolbar__legend-item--build"
              title="Hash build Vercel — verifică că e același cu ultimul push"
            >
              build {process.env.NEXT_PUBLIC_BUILD_SHA}
            </span>
          ) : null}
        </div>
      </div>
      <GanttToolbarOccForm
        mode={occFormMode}
        rooms={rooms}
        onClose={() => setOccFormMode(null)}
      />
    </div>
  );
}
