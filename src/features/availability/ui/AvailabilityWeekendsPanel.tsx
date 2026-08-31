"use client";

import type { CSSProperties } from "react";
import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { WeekendPick } from "@/domain/availability/weekend-finder";
import { ganttStaySurface } from "@/lib/gantt-stay-surface";
import { ganttStaySlantRadiusClosed } from "@/lib/gantt-stay-shape";
import { parseIso } from "@/lib/stay-dates";

function weekendRangeTitle(w: WeekendPick, locale: string): string {
  const format = new Intl.DateTimeFormat(locale, { month: "short" });
  const sat = parseIso(w.saturday_iso);
  const sun = parseIso(w.sunday_iso);
  const sameMonth = sat.getMonth() === sun.getMonth();
  if (sameMonth) {
    return `${sat.getDate()}–${sun.getDate()} ${format.format(sat)}`;
  }
  return `${sat.getDate()} ${format.format(sat)} – ${sun.getDate()} ${format.format(sun)}`;
}

function weekendSubtitle(w: WeekendPick, fallback: string): string {
  if (w.label.includes("/")) return w.label.split(" ").slice(1).join(" ") || fallback;
  return fallback;
}

type Props = {
  weekends: WeekendPick[];
  nextSaturdayIso: string | null;
  accentColor: string | null;
  onSelect?: (saturdayIso: string) => void;
  readOnly?: boolean;
};

function WeekendCardContent({
  w,
  isNext,
  locale,
  tPage,
  tCommon,
}: {
  w: WeekendPick;
  isNext: boolean;
  locale: string;
  tPage: (key: string) => string;
  tCommon: (key: string) => string;
}) {
  return (
    <>
      <span className="avail-weekend-card__main">
        {isNext && (
          <span className="avail-weekend-card__flag">{tCommon("next")}</span>
        )}
        <span className="avail-weekend-card__range">
          {weekendRangeTitle(w, locale)}
        </span>
        <span className="avail-weekend-card__dow">{weekendSubtitle(w, tPage("satSun"))}</span>
      </span>
      <span className="avail-weekend-card__count" aria-hidden>
        {w.min_free_rooms}
        <span className="avail-weekend-card__count-unit">{tCommon("roomsShort")}</span>
      </span>
      <span className="gantt-stay__end-tab avail-weekend-card__tab" aria-hidden>
        <span className="gantt-stay__end-tab-arrow">›</span>
      </span>
    </>
  );
}

export function AvailabilityWeekendsPanel({
  weekends,
  nextSaturdayIso,
  accentColor,
  onSelect,
  readOnly = false,
}: Props) {
  const locale = useLocale();
  const tPage = useTranslations("admin.availability");
  const tCommon = useTranslations("admin.common");
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
      aria-label={tPage("freeWeekends")}
    >
      <header className="avail-weekends-panel__head">
        <div className="avail-weekends-panel__titles">
          <h3 className="avail-weekends-panel__title">{tPage("freeWeekends")}</h3>
          <p className="avail-weekends-panel__sub">
            {tPage("freeWeekendsSubtitle")}
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

          const cardClass = [
            "avail-weekend-card gantt-stay--slant gantt-stay--filled",
            isNext && "avail-weekend-card--next",
            readOnly && "avail-weekend-card--readonly",
          ]
            .filter(Boolean)
            .join(" ");
          const cardTitle = `${weekendRangeTitle(w, locale)} · ${w.min_free_rooms} ${tPage("freeRooms")}`;

          if (readOnly) {
            return (
              <div
                key={w.saturday_iso}
                className={cardClass}
                style={cardStyle}
                title={cardTitle}
              >
                <WeekendCardContent
                  w={w}
                  isNext={isNext}
                  locale={locale}
                  tPage={tPage}
                  tCommon={tCommon}
                />
              </div>
            );
          }

          return (
            <button
              key={w.saturday_iso}
              type="button"
              className={cardClass}
              style={cardStyle}
              onClick={() => onSelect?.(w.saturday_iso)}
              title={cardTitle}
            >
              <WeekendCardContent
                w={w}
                isNext={isNext}
                locale={locale}
                tPage={tPage}
                tCommon={tCommon}
              />
            </button>
          );
        })}
      </div>
    </section>
  );
}
