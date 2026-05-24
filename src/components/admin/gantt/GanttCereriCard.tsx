"use client";

import Link from "next/link";
import { ganttStayChromeClass } from "@/lib/gantt-stay-chrome";

type Props = {
  href: string;
  label: string;
  dates: string;
  party: string;
};

export function GanttCereriCard({ href, label, dates, party }: Props) {
  return (
    <Link
      href={href}
      className={[
        ganttStayChromeClass(),
        "gantt-booking-card gantt-booking-card--pending gantt-cereri-card gantt-stay--filled gantt-stay--cerere gantt-timeline-bar gantt-stay--capsule",
      ].join(" ")}
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
