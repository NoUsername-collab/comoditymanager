"use client";

import { Link } from "@/i18n/navigation";
import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatGuestGanttLabel } from "@/domain/guest-name";
import { GanttRequestsCard } from "@/features/calendar/ui/GanttRequestsCard";
import { formatGuestPartyShort } from "@/lib/guest-party";
import { formatStayPeriod } from "@/lib/ro-calendar";
import type { BookingRow } from "@/services/bookings";

export function GanttRequestsQueue({
  requests,
  embedded = false,
  inline = false,
  top = false,
  title,
  subtitle,
  ariaLabel,
}: {
  requests: BookingRow[];
  /** Nested inside the toolbar panel — no extra chrome */
  embedded?: boolean;
  /** Compact control strip with a short header */
  inline?: boolean;
  /** Full-page toolbar, above the Gantt grid */
  top?: boolean;
  title?: string;
  subtitle?: string | null;
  ariaLabel?: string;
}) {
  const tCommon = useTranslations("admin.common");
  const tGantt = useTranslations("admin.gantt");
  const locale = useLocale();
  const sorted = useMemo(
    () =>
      [...requests].sort((a, b) =>
        a.check_in.localeCompare(b.check_in) || a.check_out.localeCompare(b.check_out)
      ),
    [requests]
  );

  if (sorted.length === 0) return null;

  const resolvedTitle = title ?? (inline || top ? tCommon("noRoom") : tGantt("queue.requestsNoRoom"));
  const resolvedSubtitle =
    subtitle === undefined
      ? inline || top
        ? null
        : tGantt("queue.visibleHint")
      : subtitle;
  const resolvedAriaLabel = ariaLabel ?? resolvedTitle;

  return (
    <section
      id="gantt-requests-queue"
      className={[
        "gantt-requests-queue",
        embedded && "gantt-requests-queue--embedded",
        inline && "gantt-requests-queue--inline",
        top && "gantt-requests-queue--top",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={resolvedAriaLabel}
    >
      <header className="gantt-requests-queue__head">
        <div>
          <h2 className="gantt-requests-queue__title">
            {resolvedTitle}
            <span className="gantt-requests-queue__count">{sorted.length}</span>
          </h2>
          {resolvedSubtitle && (
            <p className="gantt-requests-queue__sub">
              {resolvedSubtitle}
            </p>
          )}
        </div>
        <Link href="/admin/bookings" className="gantt-requests-queue__all-link">
          {inline ? tGantt("queue.allArrow") : tGantt("queue.allRequestsArrow")}
        </Link>
      </header>

      <div className="gantt-requests-queue__scroller">
        {sorted.map((b) => {
          const label = formatGuestGanttLabel(
            b.guest_last_name,
            b.guest_first_name,
            b.guest_name
          );
          return (
            <GanttRequestsCard
              key={b.id}
              href={`/admin/bookings/${b.id}`}
              label={label}
              dates={formatStayPeriod(b.check_in, b.check_out, locale)}
              party={formatGuestPartyShort(b.num_adults, b.num_children)}
              alertLevel={b.guest_alert_level}
            />
          );
        })}
      </div>
    </section>
  );
}
