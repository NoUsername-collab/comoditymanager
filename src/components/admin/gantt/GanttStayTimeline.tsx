"use client";

import { useTranslations } from "next-intl";
import type { CSSProperties } from "react";
import type { GanttStayTimeline as GanttStayTimelineModel } from "@/domain/gantt/stay-card-display";

function timelineTitle(
  timeline: GanttStayTimelineModel,
  tGantt: ReturnType<typeof useTranslations<"admin.gantt">>
): string {
  if (timeline.variant === "hybrid") {
    if (!timeline.milestoneReached) {
      return tGantt("stayCard.hybridCheckin", {
        checked: timeline.roomsChecked,
        total: timeline.roomsTotal,
      });
    }
    return tGantt("stayCard.hybridStay", {
      current: timeline.nightsCurrent,
      total: timeline.nightsTotal,
    });
  }
  if (timeline.variant === "checkin") {
    return tGantt("stayCard.roomsProgress", {
      checked: timeline.roomsChecked,
      total: timeline.roomsTotal,
    });
  }
  return tGantt("stayCard.nightsProgress", {
    current: timeline.nightsCurrent,
    total: timeline.nightsTotal,
  });
}

export function GanttStayTimeline({
  timeline,
  className = "",
}: {
  timeline: GanttStayTimelineModel;
  className?: string;
}) {
  const tGantt = useTranslations("admin.gantt");
  const showCheckinKnobs =
    timeline.variant === "hybrid" || timeline.variant === "checkin";

  return (
    <span
      className={[
        "gantt-stay__timeline",
        timeline.variant === "hybrid" && "gantt-stay__timeline--hybrid",
        timeline.variant === "checkin" && "gantt-stay__timeline--checkin",
        timeline.milestoneReached && "gantt-stay__timeline--milestone-done",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      title={timelineTitle(timeline, tGantt)}
      aria-hidden
    >
      <span
        className="gantt-stay__timeline-track"
        style={
          {
            "--stay-timeline-fill": `${timeline.overallFillPct}%`,
            "--stay-checkin-seg": `${timeline.checkinSegmentPct}%`,
          } as CSSProperties
        }
      >
        <span className="gantt-stay__timeline-fill" />
        {timeline.variant === "hybrid" ? (
          <span
            className="gantt-stay__timeline-divider"
            style={{ left: `${timeline.checkinSegmentPct}%` }}
          />
        ) : null}
        {showCheckinKnobs ? (
          <span
            className={[
              "gantt-stay__timeline-knob gantt-stay__timeline-knob--start",
              timeline.checkinStarted && "gantt-stay__timeline-knob--active",
            ]
              .filter(Boolean)
              .join(" ")}
            title={tGantt("stayCard.checkinStarted")}
          />
        ) : null}
        {timeline.variant === "hybrid" || timeline.variant === "checkin" ? (
          <span
            className={[
              "gantt-stay__timeline-knob gantt-stay__timeline-knob--milestone",
              timeline.milestoneReached && "gantt-stay__timeline-knob--done",
            ]
              .filter(Boolean)
              .join(" ")}
            style={{
              left:
                timeline.variant === "hybrid"
                  ? `${timeline.checkinSegmentPct}%`
                  : "100%",
            }}
            title={
              timeline.milestoneReached
                ? tGantt("stayCard.milestoneDone")
                : tGantt("stayCard.milestonePending")
            }
          />
        ) : null}
      </span>
    </span>
  );
}
