"use client";

import type { CSSProperties } from "react";
import { useMemo } from "react";
import type { WeekendPick } from "@/domain/availability/weekend-finder";
import { ganttStaySurface } from "@/lib/gantt-stay-surface";
import { ganttStaySlantRadiusClosed } from "@/lib/gantt-stay-shape";
import { parseIso } from "@/lib/stay-dates";

const RO_MONTHS_SHORT = [
  "Ian",
  "Feb",
  "Mar",
  "Apr",
  "Mai",
  "Iun",
  "Iul",
  "Aug",
  "Sep",
  "Oct",
  "Noi",
  "Dec",
] as const;

function weekendRangeTitle(w: WeekendPick): string {
  const sat = parseIso(w.saturday_iso);
  const sun = parseIso(w.sunday_iso);
  const sameMonth = sat.getMonth() === sun.getMonth();
  if (sameMonth) {
    return `${sat.getDate()}–${sun.getDate()} ${RO_MONTHS_SHORT[sat.getMonth()]}`;
  }
  return `${sat.getDate()} ${RO_MONTHS_SHORT[sat.getMonth()]} – ${sun.getDate()} ${RO_MONTHS_SHORT[sun.getMonth()]}`;
}

function weekendSubtitle(w: WeekendPick): string {
  if (w.label.includes("/")) return w.label.split(" ").slice(1).join(" ") || "Sam / Dum";
  return "Sam · Dum";
}

type Props = {
  weekends: WeekendPick[];
  nextSaturdayIso: string | null;
  accentColor: string | null;
  onSelect: (saturdayIso: string) => void;
};

export function AvailabilityWeekendsPanel({
  weekends,
  nextSaturdayIso,
  accentColor,
  onSelect,
}: Props) {
  const surface = ganttStaySurface(accentColor, false);

  const slots = useMemo(() => {
    const list = weekends.slice(0, 4);
    return Array.from({ length: 4 }, (_, i) => list[i] ?? null);
  }, [weekends]);

  const panelStyle = {
    "--weekend-accent": surface.fill,
    "--weekend-accent-muted": surface.glow,
  } as CSSProperties;

  return (
    <section
      className="avail-weekends-panel"
      style={panelStyle}
      aria-label="Weekenduri libere"
    >
      <header className="avail-weekends-panel__head">
        <div className="avail-weekends-panel__titles">
          <h3 className="avail-weekends-panel__title">Weekenduri libere</h3>
          <p className="avail-weekends-panel__sub">
            Următoarele 4 weekenduri cu ≥2 camere libere (sâmbătă + duminică)
          </p>
        </div>
        <span
          className="avail-weekends-panel__accent-swatch"
          style={{ background: surface.fill, borderColor: surface.border }}
          aria-hidden
        />
      </header>

      <div className="avail-weekends-panel__grid">
        {slots.map((w, index) => {
          if (!w) {
            return (
              <div
                key={`empty-${index}`}
                className="avail-weekend-card avail-weekend-card--empty"
                aria-hidden
              >
                <span className="avail-weekend-card__range">—</span>
                <span className="avail-weekend-card__meta">—</span>
              </div>
            );
          }

          const isNext = w.saturday_iso === nextSaturdayIso;
          const cardStyle = {
            "--stay-fill": surface.fill,
            "--stay-tab-end": surface.tabEnd,
            "--stay-border": surface.border,
            "--stay-text": surface.text,
            "--stay-badge-bg": surface.badgeBg,
            "--stay-badge-text": surface.badgeText,
            "--stay-glow": surface.glow,
            backgroundColor: surface.fill,
            color: surface.text,
            border: "none",
            borderRadius: ganttStaySlantRadiusClosed(),
            boxShadow: isNext
              ? `inset 3px 0 0 ${surface.border}, 0 0 0 2px color-mix(in srgb, ${surface.glow} 50%, transparent), 0 4px 14px color-mix(in srgb, ${surface.glow} 35%, transparent)`
              : `inset 3px 0 0 color-mix(in srgb, ${surface.border} 70%, transparent), 0 1px 4px color-mix(in srgb, ${surface.glow} 30%, transparent)`,
          } as CSSProperties & Record<`--${string}`, string>;

          return (
            <button
              key={w.saturday_iso}
              type="button"
              className={[
                "avail-weekend-card gantt-stay--slant gantt-stay--filled",
                isNext && "avail-weekend-card--next",
              ]
                .filter(Boolean)
                .join(" ")}
              style={cardStyle}
              onClick={() => onSelect(w.saturday_iso)}
              title={`${weekendRangeTitle(w)} · ${w.min_free_rooms} camere libere`}
            >
              <span className="avail-weekend-card__main">
                {isNext && (
                  <span className="avail-weekend-card__flag">Următor</span>
                )}
                <span className="avail-weekend-card__range">
                  {weekendRangeTitle(w)}
                </span>
                <span className="avail-weekend-card__dow">{weekendSubtitle(w)}</span>
              </span>
              <span className="avail-weekend-card__count" aria-hidden>
                {w.min_free_rooms}
                <span className="avail-weekend-card__count-unit">cam</span>
              </span>
              <span className="gantt-stay__end-tab avail-weekend-card__tab" aria-hidden>
                <span className="gantt-stay__end-tab-arrow">›</span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
