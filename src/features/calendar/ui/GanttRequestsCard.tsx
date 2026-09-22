"use client";

import { memo } from "react";
import { Link } from "@/i18n/navigation";
import { ganttStayChromeClass } from "@/lib/gantt-stay-chrome";
import type { GuestFlagLevel } from "@/domain/guest/types";
import { GuestFlagPill } from "@/features/guests/ui/GuestFlagPill";

type Props = {
  href: string;
  label: string;
  dates: string;
  party: string;
  alertLevel?: GuestFlagLevel | null;
};

export const GanttRequestsCard = memo(function GanttRequestsCard({
  href,
  label,
  dates,
  party,
  alertLevel,
}: Props) {
  return (
    <Link
      href={href}
      className={[
        ganttStayChromeClass(),
        "gantt-booking-card gantt-booking-card--pending gantt-requests-card gantt-stay--filled gantt-stay--request gantt-stay--chip gantt-timeline-bar gantt-stay--capsule",
      ].join(" ")}
    >
      <span className="gantt-stay__spine" aria-hidden />
      <span className="gantt-requests-card__main">
        <span className="gantt-stay-chrome__label gantt-requests-card__guest">{label}</span>
        <span className="gantt-requests-card__dates">{dates}</span>
      </span>
      <span className="gantt-requests-card__risk">
        <GuestFlagPill flagLevel={alertLevel} />
      </span>
      <span className="gantt-requests-card__party">{party}</span>
      <span className="gantt-stay__end-tab gantt-requests-card__tab" aria-hidden>
        <span className="gantt-stay__end-tab-arrow">›</span>
      </span>
      <span className="gantt-stay__stamp" aria-hidden>
        CERERE
      </span>
    </Link>
  );
});
