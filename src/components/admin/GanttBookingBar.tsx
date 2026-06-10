"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import type { OccupancyPhase } from "@/domain/occupancy/types";
import { memo, type CSSProperties } from "react";
import type { GanttBarPosition } from "@/domain/gantt/bar-position";
import type { GanttStayTimeline as GanttStayTimelineModel } from "@/domain/gantt/stay-card-display";
import { GanttStayTimeline } from "@/components/admin/gantt/GanttStayTimeline";
import { ganttStayChromeClass } from "@/lib/gantt-stay-chrome";
import { ganttStaySlantRadius } from "@/lib/gantt-stay-shape";
import type { StayTodayHighlight } from "@/domain/gantt/today-activity";
import { GANTT_STAY_H, GANTT_STAY_TOP } from "@/domain/gantt/layout";

type Props = {
  href: string;
  label: string;
  title: string;
  pos: GanttBarPosition;
  isCerere: boolean;
  guestTotal: number;
  buildingColor?: string | null;
  todayHighlight?: StayTodayHighlight;
  initials?: string;
  interactive?: boolean;
  extraClass?: string;
  occupancyPhase?: OccupancyPhase;
  compact?: boolean;
  timeline?: GanttStayTimelineModel | null;
  showUnpaid?: boolean;
  showMissingIdentity?: boolean;
};

function semanticStayVars(
  isCerere: boolean,
  occupancyPhase?: OccupancyPhase,
  buildingColor?: string | null
): CSSProperties & Record<string, string> {
  const tone =
    occupancyPhase === "past"
      ? {
          fill: "var(--booking-past-bg)",
          border: "var(--booking-past-border)",
          text: "var(--booking-past-text)",
          tab: "color-mix(in srgb, var(--booking-past-border) 82%, black)",
          badge: "color-mix(in srgb, var(--booking-past-text) 14%, transparent)",
          glow: "color-mix(in srgb, var(--booking-past-border) 35%, transparent)",
        }
      : isCerere
        ? {
            fill: "var(--booking-pending-bg)",
            border: "var(--booking-pending-border)",
            text: "var(--booking-pending-text)",
            tab: "color-mix(in srgb, var(--booking-pending-border) 85%, black)",
            badge:
              "color-mix(in srgb, var(--booking-pending-text) 18%, transparent)",
            glow:
              "color-mix(in srgb, var(--booking-pending-border) 35%, transparent)",
          }
        : {
            fill: "var(--booking-active-bg)",
            border: "var(--booking-active-border)",
            text: "var(--booking-active-text)",
            tab: "color-mix(in srgb, var(--booking-active-border) 85%, black)",
            badge:
              "color-mix(in srgb, var(--booking-active-text) 18%, transparent)",
            glow:
              "color-mix(in srgb, var(--booking-active-border) 35%, transparent)",
          };

  const spine = buildingColor?.trim() || tone.border;

  return {
    background: tone.fill,
    backgroundColor: tone.fill,
    borderColor: tone.border,
    color: tone.text,
    "--stay-fill": tone.fill,
    "--stay-border": tone.border,
    "--stay-text": tone.text,
    "--stay-tab-end": tone.tab,
    "--stay-badge-bg": tone.badge,
    "--stay-badge-text": tone.text,
    "--stay-glow": tone.glow,
    "--stay-spine": spine,
    "--gs-bg": tone.fill,
    "--gs-border": tone.border,
    "--gs-fg": tone.text,
    "--gs-tab": tone.tab,
    "--gs-badge-bg": tone.badge,
    "--gs-glow": tone.glow,
  };
}

export const GanttBookingBar = memo(function GanttBookingBar({
  href,
  label,
  title,
  pos,
  isCerere,
  guestTotal,
  buildingColor,
  todayHighlight,
  initials,
  interactive,
  extraClass,
  occupancyPhase,
  compact = false,
  timeline = null,
  showUnpaid = false,
  showMissingIdentity = false,
}: Props) {
  const tCommon = useTranslations("admin.common");
  const tGantt = useTranslations("admin.gantt");
  const { leftPct, widthPct, continuesBefore, continuesAfter } = pos;

  const showProgress = !!timeline;
  const showAlerts = showUnpaid || showMissingIdentity;

  const className = [
    ganttStayChromeClass(),
    "gantt-booking-card gantt-stay gantt-stay--slant gantt-stay--filled gantt-stay--chip gantt-timeline-bar group relative box-border flex min-w-0 items-stretch overflow-hidden text-[12px] font-semibold leading-none transition duration-200 hover:z-[2]",
    interactive ? "z-[1] w-full" : "absolute z-[1] max-w-full",
    compact && "gantt-stay--compact",
    isCerere ? "gantt-booking-card--pending gantt-stay--cerere" : "gantt-booking-card--active",
    occupancyPhase === "past" && "gantt-booking-card--past gantt-stay--phase-past",
    occupancyPhase === "active" && "gantt-stay--phase-active",
    occupancyPhase === "future" && "gantt-stay--phase-future",
    todayHighlight === "arrival" && "gantt-stay--today-arrival",
    todayHighlight === "departure" && "gantt-stay--today-departure",
    todayHighlight === "turnover" && "gantt-stay--today-turnover",
    continuesBefore && "gantt-stay--from-prev",
    continuesAfter && "gantt-stay--to-next",
    interactive && "cursor-pointer",
    extraClass,
  ]
    .filter(Boolean)
    .join(" ");

  const style = {
    ...semanticStayVars(isCerere, occupancyPhase, buildingColor),
    borderRadius: ganttStaySlantRadius(continuesBefore, continuesAfter),
    height: GANTT_STAY_H,
    ...(!interactive ? { top: GANTT_STAY_TOP } : {}),
    ...(interactive
      ? { left: 0, width: "100%" }
      : {
          left: `${leftPct}%`,
          width: `${widthPct}%`,
          maxWidth: `${100 - leftPct}%`,
        }),
  } as CSSProperties;

  const inner = (
    <>
      <span className="gantt-stay__spine" aria-hidden />

      {continuesBefore && (
        <span className="gantt-stay-edge gantt-stay-edge--left shrink-0" aria-hidden />
      )}

      <span className="gantt-stay__body flex min-w-0 flex-1 items-center gap-0.5 px-1.5 py-1">
        {continuesBefore && (
          <span
            className="shrink-0 opacity-80"
            aria-label={tCommon("continuesFromPreviousMonth")}
          >
            ‹
          </span>
        )}

        {todayHighlight === "arrival" && (
          <span className="gantt-stay__today-icon" aria-hidden title="Sosire azi">
            ↓
          </span>
        )}
        {todayHighlight === "departure" && (
          <span className="gantt-stay__today-icon" aria-hidden title="Plecare azi">
            ↑
          </span>
        )}

        {!compact && initials && (
          <span className="gantt-stay__avatar gantt-stay__avatar--hex shrink-0" aria-hidden>
            {initials}
          </span>
        )}

        <span className="gantt-stay__content min-w-0 flex-1">
          <span className="gantt-stay-chrome__label min-w-0 truncate">{label}</span>
          {(showAlerts || showProgress) && (
            <span className="gantt-stay__meta min-w-0">
              {showAlerts && (
                <span className="gantt-stay__alerts" aria-hidden>
                  {showUnpaid && (
                    <span
                      className="gantt-stay__alert gantt-stay__alert--unpaid"
                      title={tGantt("stayCard.unpaid")}
                    >
                      $
                    </span>
                  )}
                  {showMissingIdentity && (
                    <span
                      className="gantt-stay__alert gantt-stay__alert--identity"
                      title={tGantt("stayCard.missingIdentity")}
                    >
                      ID
                    </span>
                  )}
                </span>
              )}
              {showProgress && timeline ? (
                <GanttStayTimeline timeline={timeline} />
              ) : null}
            </span>
          )}
        </span>

        {occupancyPhase === "active" && !isCerere && (
          <span className="gantt-stay__phase-badge shrink-0">IN</span>
        )}

        <span
          className="gantt-stay__badge shrink-0 rounded-full px-1.5 py-0.5 text-[11px] font-bold tabular-nums leading-none"
          title={`${guestTotal} persoane`}
        >
          {guestTotal}
        </span>
      </span>

      {!continuesAfter && (
        <span className="gantt-stay__end-tab shrink-0" aria-hidden>
          <span className="gantt-stay__end-tab-arrow">›</span>
        </span>
      )}

      {continuesAfter && (
        <span className="gantt-stay-edge gantt-stay-edge--right shrink-0" aria-hidden />
      )}

      {isCerere && (
        <span className="gantt-stay__stamp" aria-hidden>
          CERERE
        </span>
      )}
    </>
  );

  const barProps = {
    title,
    className,
    style,
  };

  if (interactive) {
    return <div {...barProps}>{inner}</div>;
  }

  return (
    <Link href={href} {...barProps}>
      {inner}
    </Link>
  );
});
