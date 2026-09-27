"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import type { OccupancyPhase } from "@/domain/occupancy/types";
import { memo, type CSSProperties } from "react";
import type { GanttBarPosition } from "@/domain/gantt/bar-position";
import {
  resolveGanttStayDeskMarks,
  type GanttStayCapHealth,
  type GanttStayDeskMark,
  type GanttStayTimeline as GanttStayTimelineModel,
} from "@/domain/gantt/stay-card-display";
import { ganttStayChromeClass } from "@/lib/gantt-stay-chrome";
import { ganttStaySlantRadius } from "@/lib/gantt-stay-shape";
import type { StayTodayHighlight } from "@/domain/gantt/today-activity";

type Props = {
  href: string;
  label: string;
  title: string;
  pos: GanttBarPosition;
  isRequest: boolean;
  guestTotal: number;
  buildingColor?: string | null;
  todayHighlight?: StayTodayHighlight;
  initials?: string;
  interactive?: boolean;
  extraClass?: string;
  occupancyPhase?: OccupancyPhase;
  compact?: boolean;
  /** 30-room coverage: one desk mark, name-first. */
  dense?: boolean;
  timeline?: GanttStayTimelineModel | null;
  showUnpaid?: boolean;
  showMissingIdentity?: boolean;
  keysMicroLabel?: string | null;
  checkinReady?: boolean;
  capHealth?: GanttStayCapHealth;
  capHealthLabel?: string;
  earlyDeparture?: boolean;
  earlyDepartureNote?: string | null;
};

function semanticStayVars(
  isRequest: boolean,
  occupancyPhase?: OccupancyPhase,
  buildingColor?: string | null
): CSSProperties & Record<string, string> {
  const isPast = occupancyPhase === "past";
  const building = buildingColor?.trim() || null;

  const tone = isPast
    ? {
        fill: "var(--gantt-bar-fill-past, var(--past-bg))",
        border: "var(--past-border)",
        text: "var(--past-text)",
        tab: "color-mix(in srgb, var(--past-border) 85%, black)",
        badge: "color-mix(in srgb, var(--past-text) 12%, var(--past-bg))",
        glow: "color-mix(in srgb, var(--past-border) 40%, transparent)",
      }
    : isRequest
      ? {
          fill: "var(--gantt-bar-fill-pending, var(--booking-pending-bg))",
          border: "var(--booking-pending-border)",
          text: "var(--booking-pending-text)",
          tab: "color-mix(in srgb, var(--booking-pending-border) 85%, black)",
          badge:
            "color-mix(in srgb, var(--booking-pending-text) 18%, transparent)",
          glow:
            "color-mix(in srgb, var(--booking-pending-border) 35%, transparent)",
        }
      : {
          fill: "var(--gantt-bar-fill-active, color-mix(in srgb, var(--booking-active-bg) 55%, var(--booking-active-border) 45%))",
          border: "var(--booking-active-border)",
          text: "var(--booking-active-text)",
          tab: "color-mix(in srgb, var(--booking-active-border) 85%, black)",
          badge:
            "color-mix(in srgb, var(--booking-active-text) 18%, transparent)",
          glow:
            "color-mix(in srgb, var(--booking-active-border) 35%, transparent)",
        };

  const fill =
    building && !isPast && !isRequest
      ? `color-mix(in srgb, ${building} 18%, ${tone.fill})`
      : tone.fill;

  const borderColor =
    building && !isPast
      ? `color-mix(in srgb, ${building} 36%, ${tone.border})`
      : tone.border;

  const spine =
    isPast && building
      ? `color-mix(in srgb, ${building} 55%, var(--past-border))`
      : building || tone.border;

  return {
    background: fill,
    backgroundColor: fill,
    borderColor,
    borderWidth: isPast ? "1px" : "1.5px",
    color: tone.text,
    "--stay-fill": fill,
    "--stay-border": tone.border,
    "--stay-text": tone.text,
    "--stay-tab-end": tone.tab,
    "--stay-badge-bg": tone.badge,
    "--stay-badge-text": tone.text,
    "--stay-glow": tone.glow,
    "--stay-spine": spine,
    "--gs-bg": fill,
    "--gs-border": tone.border,
    "--gs-fg": tone.text,
    "--gs-tab": tone.tab,
    "--gs-badge-bg": tone.badge,
    "--gs-glow": tone.glow,
  };
}

function StayDeskMark({
  mark,
  guestTotal,
  checkinReady,
  earlyDepartureNote,
  tGantt,
}: {
  mark: GanttStayDeskMark;
  guestTotal: number;
  checkinReady: boolean;
  earlyDepartureNote: string | null;
  tGantt: ReturnType<typeof useTranslations>;
}) {
  if (mark === "arrival") {
    return (
      <span
        className="gantt-stay__today-icon"
        aria-hidden
        title={tGantt("stayCard.arrivalToday")}
      >
        ↓
      </span>
    );
  }
  if (mark === "departure" || mark === "early_out") {
    return (
      <span
        className={[
          "gantt-stay__today-icon",
          mark === "early_out" && "gantt-stay__today-icon--early-out",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-hidden
        title={
          earlyDepartureNote ??
          (mark === "early_out"
            ? tGantt("stayCard.earlyDepartureRecorded")
            : tGantt("stayCard.departureToday"))
        }
      >
        ↑
      </span>
    );
  }
  if (mark === "unpaid") {
    return (
      <span
        className="gantt-stay__alert gantt-stay__alert--unpaid"
        title={tGantt("stayCard.unpaid")}
      >
        $
      </span>
    );
  }
  if (mark === "identity") {
    return (
      <span
        className="gantt-stay__alert gantt-stay__alert--identity"
        title={tGantt("stayCard.missingIdentity")}
      >
        ID
      </span>
    );
  }
  if (mark === "in_house") {
    return (
      <span
        className={[
          "gantt-stay__phase-badge",
          checkinReady && "gantt-stay__phase-badge--ready",
        ]
          .filter(Boolean)
          .join(" ")}
        title={
          checkinReady
            ? tGantt("stayCard.milestoneDone")
            : tGantt("stayCard.milestonePending")
        }
      >
        {checkinReady ? (
          <span className="gantt-stay__phase-gem" aria-hidden />
        ) : null}
        IN
      </span>
    );
  }
  return (
    <span
      className="gantt-stay__badge"
      title={tGantt("stayCard.guestCount", { count: guestTotal })}
    >
      {guestTotal}
    </span>
  );
}

export const GanttBookingBar = memo(function GanttBookingBar({
  href,
  label,
  title,
  pos,
  isRequest,
  guestTotal,
  buildingColor,
  todayHighlight,
  interactive,
  extraClass,
  occupancyPhase,
  compact = false,
  dense = false,
  timeline: _timeline = null,
  showUnpaid = false,
  showMissingIdentity = false,
  keysMicroLabel: _keysMicroLabel = null,
  checkinReady = false,
  capHealth = "neutral",
  capHealthLabel,
  earlyDeparture = false,
  earlyDepartureNote = null,
}: Props) {
  const tCommon = useTranslations("admin.common");
  const tGantt = useTranslations("admin.gantt");
  const { leftPct, widthPct, continuesBefore, continuesAfter } = pos;

  const desk = resolveGanttStayDeskMarks({
    dense: dense || compact,
    showUnpaid,
    showMissingIdentity,
    todayHighlight,
    earlyDeparture,
    inHouse: occupancyPhase === "active" && !isRequest,
    guestTotal,
  });
  const denseChip = dense || compact;

  const className = [
    ganttStayChromeClass(),
    "gantt-booking-card gantt-stay gantt-stay--slant gantt-stay--filled gantt-stay--chip gantt-timeline-bar group relative box-border flex min-w-0 items-stretch text-[12px] font-semibold leading-none transition duration-200 hover:z-[2]",
    interactive ? "z-[1] w-full" : "absolute z-[1] max-w-full",
    compact && "gantt-stay--compact",
    denseChip && "gantt-stay--dense",
    isRequest ? "gantt-booking-card--pending gantt-stay--request" : "gantt-booking-card--active",
    occupancyPhase === "past" && "gantt-booking-card--past gantt-stay--phase-past",
    occupancyPhase === "active" && "gantt-stay--phase-active",
    occupancyPhase === "future" && "gantt-stay--phase-future",
    todayHighlight === "arrival" && "gantt-stay--today-arrival",
    todayHighlight === "departure" && "gantt-stay--today-departure",
    todayHighlight === "turnover" && "gantt-stay--today-turnover",
    capHealth === "ok" && "gantt-stay--cap-ok",
    capHealth === "problem" && "gantt-stay--cap-problem",
    continuesBefore && "gantt-stay--from-prev",
    continuesAfter && "gantt-stay--to-next",
    interactive && "cursor-pointer",
    extraClass,
  ]
    .filter(Boolean)
    .join(" ");

  const style = {
    ...semanticStayVars(isRequest, occupancyPhase, buildingColor),
    borderRadius: ganttStaySlantRadius(continuesBefore, continuesAfter),
    height: "var(--gantt-stay-h, 33px)",
    ...(!interactive ? { top: "var(--gantt-stay-top, 8px)" } : {}),
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

      <span className="gantt-stay__body">
        {continuesBefore && (
          <span
            className="gantt-stay__edge-mark shrink-0"
            aria-label={tCommon("continuesFromPreviousMonth")}
          >
            ‹
          </span>
        )}

        <span className="gantt-stay__primary min-w-0 flex-1">
          <span className="gantt-stay-chrome__label min-w-0 truncate">{label}</span>
        </span>
      </span>

      {desk.marks.length > 0 && (
        <span className="gantt-stay__cap-strip">
          {desk.marks.map((mark) => (
            <StayDeskMark
              key={mark}
              mark={mark}
              guestTotal={guestTotal}
              checkinReady={checkinReady}
              earlyDepartureNote={earlyDepartureNote}
              tGantt={tGantt}
            />
          ))}
        </span>
      )}

      {!continuesAfter && (
        <span
          className={[
            "gantt-stay__end-tab shrink-0",
            capHealth === "ok" && "gantt-stay__end-tab--ok",
            capHealth === "problem" && "gantt-stay__end-tab--problem",
          ]
            .filter(Boolean)
            .join(" ")}
          title={capHealthLabel}
          aria-label={capHealthLabel}
        >
          {capHealth === "ok" ? (
            <span className="gantt-stay__end-tab-bulb" aria-hidden>
              <svg viewBox="0 0 12 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M6 1.25C4.07 1.25 2.5 2.82 2.5 4.75c0 1.35.67 2.54 1.7 3.26L5.75 10.1V11.5h.5v-1.4l1.55-1.99c1.03-.72 1.7-1.91 1.7-3.26 0-1.93-1.57-3.5-3.5-3.5Z"
                  fill="#ecfccb"
                  stroke="#14532d"
                  strokeWidth="0.75"
                />
                <rect
                  x="4.6"
                  y="12"
                  width="2.8"
                  height="0.85"
                  rx="0.2"
                  fill="#dcfce7"
                  stroke="#14532d"
                  strokeWidth="0.45"
                />
                <rect x="4.85" y="13.1" width="2.3" height="0.65" rx="0.15" fill="#bbf7d0" />
              </svg>
            </span>
          ) : capHealth === "problem" ? (
            <span className="gantt-stay__end-tab-mark" aria-hidden>
              !
            </span>
          ) : (
            <span className="gantt-stay__end-tab-arrow" aria-hidden>
              ›
            </span>
          )}
        </span>
      )}

      {continuesAfter && (
        <span className="gantt-stay-edge gantt-stay-edge--right shrink-0" aria-hidden />
      )}

      {isRequest && (
        <span className="gantt-stay__stamp gantt-stay__surface-text" aria-hidden>
          {tCommon("request")}
        </span>
      )}
    </>
  );

  const accessibleLabel = [title, earlyDepartureNote, capHealthLabel]
    .filter(Boolean)
    .join(" · ");

  const barProps = {
    title: accessibleLabel || title,
    "aria-label": accessibleLabel || title,
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
