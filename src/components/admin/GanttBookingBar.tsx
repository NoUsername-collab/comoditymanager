"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import type { OccupancyPhase } from "@/domain/occupancy/types";
import { memo, type CSSProperties } from "react";
import type { GanttBarPosition } from "@/domain/gantt/bar-position";
import type {
  GanttStayCapHealth,
  GanttStayTimeline as GanttStayTimelineModel,
} from "@/domain/gantt/stay-card-display";
import { ganttStayChromeClass } from "@/lib/gantt-stay-chrome";
import { ganttStaySlantRadius } from "@/lib/gantt-stay-shape";
import type { StayTodayHighlight } from "@/domain/gantt/today-activity";

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
  keysMicroLabel?: string | null;
  checkinReady?: boolean;
  capHealth?: GanttStayCapHealth;
  capHealthLabel?: string;
  earlyDeparture?: boolean;
  earlyDepartureNote?: string | null;
};

function semanticStayVars(
  isCerere: boolean,
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
    : isCerere
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

  const borderColor =
    building && !isPast
      ? `color-mix(in srgb, ${building} 10%, ${tone.border})`
      : tone.border;

  const spine =
    isPast && building
      ? `color-mix(in srgb, ${building} 38%, var(--past-border))`
      : building || tone.border;

  return {
    background: tone.fill,
    backgroundColor: tone.fill,
    borderColor,
    borderWidth: isPast ? "1px" : "1.5px",
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
  keysMicroLabel = null,
  checkinReady = false,
  capHealth = "neutral",
  capHealthLabel,
  earlyDeparture = false,
  earlyDepartureNote = null,
}: Props) {
  const tCommon = useTranslations("admin.common");
  const tGantt = useTranslations("admin.gantt");
  const { leftPct, widthPct, continuesBefore, continuesAfter } = pos;

  const showAlerts = showUnpaid || showMissingIdentity;

  const className = [
    ganttStayChromeClass(),
    "gantt-booking-card gantt-stay gantt-stay--slant gantt-stay--filled gantt-stay--chip gantt-timeline-bar group relative box-border flex min-w-0 items-stretch text-[12px] font-semibold leading-none transition duration-200 hover:z-[2]",
    interactive ? "z-[1] w-full" : "absolute z-[1] max-w-full",
    compact && "gantt-stay--compact",
    isCerere ? "gantt-booking-card--pending gantt-stay--cerere" : "gantt-booking-card--active",
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
    ...semanticStayVars(isCerere, occupancyPhase, buildingColor),
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
          <span className="gantt-stay-chrome__label gantt-stay__surface-text min-w-0 truncate">
            {label}
          </span>
          {(showUnpaid ||
            showMissingIdentity ||
            keysMicroLabel ||
            guestTotal > 0 ||
            todayHighlight === "arrival" ||
            todayHighlight === "departure" ||
            earlyDeparture) && (
            <span className="gantt-stay__micro" aria-hidden>
              {keysMicroLabel ? (
                <span className="gantt-stay__micro-keys" title={keysMicroLabel}>
                  🔑{keysMicroLabel}
                </span>
              ) : null}
              {todayHighlight === "arrival" ? (
                <span className="gantt-stay__micro-dot gantt-stay__micro-dot--in">↓</span>
              ) : null}
              {(todayHighlight === "departure" || earlyDeparture) ? (
                <span
                  className={[
                    "gantt-stay__micro-dot gantt-stay__micro-dot--out",
                    earlyDeparture && "gantt-stay__micro-dot--early-out",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  title={earlyDepartureNote ?? undefined}
                >
                  ↑
                </span>
              ) : null}
              {showUnpaid ? (
                <span className="gantt-stay__micro-dot gantt-stay__micro-dot--pay">$</span>
              ) : null}
              {showMissingIdentity ? (
                <span className="gantt-stay__micro-dot gantt-stay__micro-dot--id">!</span>
              ) : null}
              {guestTotal > 0 ? (
                <span className="gantt-stay__micro-count">{guestTotal}</span>
              ) : null}
            </span>
          )}
        </span>

        {(showAlerts ||
          todayHighlight ||
          earlyDeparture ||
          earlyDepartureNote ||
          (occupancyPhase === "active" && !isCerere) ||
          guestTotal > 0) && (
          <span className="gantt-stay__details">
            <span className="gantt-stay__details-head">
                {todayHighlight === "arrival" && (
                  <span className="gantt-stay__today-icon" aria-hidden title="Sosire azi">
                    ↓
                  </span>
                )}
                {(todayHighlight === "departure" || earlyDeparture) && (
                  <span
                    className={[
                      "gantt-stay__today-icon",
                      earlyDeparture && "gantt-stay__today-icon--early-out",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    aria-hidden
                    title={
                      earlyDepartureNote ??
                      (todayHighlight === "departure"
                        ? tGantt("stayCard.departureToday")
                        : tGantt("stayCard.earlyDepartureRecorded"))
                    }
                  >
                    ↑
                  </span>
                )}
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
                <span className="gantt-stay__detail-badges">
                  {occupancyPhase === "active" && !isCerere && (
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
                        <span
                          className="gantt-stay__phase-gem"
                          aria-hidden
                        />
                      ) : null}
                      IN
                    </span>
                  )}
                  {guestTotal > 0 && (
                    <span
                      className="gantt-stay__badge"
                      title={`${guestTotal} persoane`}
                    >
                      {guestTotal}
                    </span>
                  )}
                </span>
              </span>
              {earlyDepartureNote ? (
                <span
                  className="gantt-stay__policy-note gantt-stay__surface-text"
                  title={earlyDepartureNote}
                  aria-hidden
                >
                  {earlyDepartureNote}
                </span>
              ) : null}
          </span>
        )}
      </span>

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
          <span className="gantt-stay__end-tab-arrow" aria-hidden>
            ›
          </span>
          {capHealth === "problem" ? (
            <span className="gantt-stay__end-tab-mark" aria-hidden>
              !
            </span>
          ) : null}
        </span>
      )}

      {continuesAfter && (
        <span className="gantt-stay-edge gantt-stay-edge--right shrink-0" aria-hidden />
      )}

      {isCerere && (
        <span className="gantt-stay__stamp gantt-stay__surface-text" aria-hidden>
          CERERE
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
