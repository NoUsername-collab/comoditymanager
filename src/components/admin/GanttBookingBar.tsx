"use client";

import Link from "next/link";
import type { OccupancyPhase } from "@/domain/occupancy/types";
import type { CSSProperties } from "react";
import type { GanttBarPosition } from "@/domain/gantt/bar-position";
import { ganttStaySurface } from "@/lib/gantt-stay-surface";
import { ganttStayChromeClass, ganttStayChromeStyle } from "@/lib/gantt-stay-chrome";
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
};

export function GanttBookingBar({
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
}: Props) {
  const { leftPct, widthPct, continuesBefore, continuesAfter } = pos;
  const surface = ganttStaySurface(buildingColor, isCerere);

  const className = [
    ganttStayChromeClass(),
    "gantt-booking-card gantt-stay gantt-stay--slant gantt-stay--filled gantt-timeline-bar group relative box-border flex min-w-0 items-stretch overflow-hidden text-[10px] font-semibold leading-none transition duration-200 hover:z-[2]",
    interactive ? "z-[1] h-7 w-full" : "absolute top-2 z-[1] max-w-full",
    isCerere ? "gantt-booking-card--pending gantt-stay--cerere" : "gantt-booking-card--active",
    occupancyPhase === "past" && "gantt-booking-card--past gantt-stay--phase-past",
    occupancyPhase === "active" && "gantt-stay--phase-active",
    occupancyPhase === "future" && "gantt-stay--phase-future",
    todayHighlight === "arrival" && "gantt-stay--today-arrival",
    todayHighlight === "departure" && "gantt-stay--today-departure",
    todayHighlight === "turnover" && "gantt-stay--today-turnover",
    continuesBefore && "gantt-stay--from-prev",
    continuesAfter && "gantt-stay--to-next",
    interactive && "cursor-grab active:cursor-grabbing",
    extraClass,
  ]
    .filter(Boolean)
    .join(" ");

  const style = {
    ...ganttStayChromeStyle(surface),
    backgroundColor: surface.fill,
    border: `2px solid ${surface.border}`,
    borderRadius: ganttStaySlantRadius(continuesBefore, continuesAfter),
    boxShadow: `0 1px 4px color-mix(in srgb, ${surface.fill} 50%, transparent)`,
    ...(interactive
      ? { left: 0, width: "100%", height: 28 }
      : {
          left: `${leftPct}%`,
          width: `${widthPct}%`,
          maxWidth: `${100 - leftPct}%`,
          height: 28,
        }),
  } as CSSProperties;

  const inner = (
    <>
      {continuesBefore && (
        <span className="gantt-stay-edge gantt-stay-edge--left shrink-0" aria-hidden />
      )}

      <span className="gantt-stay__body flex min-w-0 flex-1 items-center gap-0.5 px-1.5 py-1">
        {continuesBefore && (
          <span
            className="shrink-0 opacity-80"
            aria-label="Continuă din luna anterioară"
          >
            ‹
          </span>
        )}
        {initials && (
          <span className="gantt-stay__avatar shrink-0" aria-hidden>
            {initials}
          </span>
        )}
        <span className="gantt-stay-chrome__label min-w-0 flex-1 truncate">
          {label}
        </span>
        {occupancyPhase === "active" && !isCerere && (
          <span className="gantt-stay__phase-badge shrink-0 rounded px-1 py-0.5 text-[8px] font-extrabold uppercase tracking-wide">
            Azi
          </span>
        )}
        <span
          className="gantt-stay__badge shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold tabular-nums leading-none"
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
}
