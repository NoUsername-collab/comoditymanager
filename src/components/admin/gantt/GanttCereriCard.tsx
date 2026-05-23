"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import type { GanttStaySurface } from "@/lib/gantt-stay-surface";
import { ganttStayChromeClass, ganttStayChromeStyle } from "@/lib/gantt-stay-chrome";

type Props = {
  href: string;
  surface: GanttStaySurface;
  label: string;
  dates: string;
  party: string;
};

export function GanttCereriCard({ href, surface, label, dates, party }: Props) {
  const style = {
    ...ganttStayChromeStyle(surface),
    backgroundColor: surface.fill,
    border: `2px solid ${surface.border}`,
  } as CSSProperties;

  return (
    <Link
      href={href}
      className={[
        ganttStayChromeClass(),
        "gantt-cereri-card gantt-stay--filled gantt-timeline-bar gantt-stay--capsule",
      ].join(" ")}
      style={style}
    >
      <span className="gantt-cereri-card__main">
        <span className="gantt-stay-chrome__label gantt-cereri-card__guest">{label}</span>
        <span className="gantt-cereri-card__dates">{dates}</span>
      </span>
      <span className="gantt-cereri-card__party">{party}</span>
      <span className="gantt-stay__end-tab gantt-cereri-card__tab" aria-hidden>
        <span className="gantt-stay__end-tab-arrow">›</span>
      </span>
    </Link>
  );
}
