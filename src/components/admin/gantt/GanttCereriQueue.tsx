"use client";

import { Link } from "@/i18n/navigation";
import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatGuestGanttLabel } from "@/domain/guest-name";
import { GanttCereriCard } from "@/components/admin/gantt/GanttCereriCard";
import { formatGuestPartyShort } from "@/lib/guest-party";
import { formatStayPeriod } from "@/lib/ro-calendar";
import type { BookingRow } from "@/services/bookings";

export function GanttCereriQueue({
  cereri,
  embedded = false,
  inline = false,
  top = false,
  title,
  subtitle,
  ariaLabel,
}: {
  cereri: BookingRow[];
  /** În interiorul panoului toolbar — fără chenar separat */
  embedded?: boolean;
  /** În banda compactă de control, cu header scurt */
  inline?: boolean;
  /** În toolbar-ul mare al paginii, deasupra Gantt-ului */
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
      [...cereri].sort((a, b) =>
        a.check_in.localeCompare(b.check_in) || a.check_out.localeCompare(b.check_out)
      ),
    [cereri]
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
      id="gantt-cereri-queue"
      className={[
        "gantt-cereri-queue",
        embedded && "gantt-cereri-queue--embedded",
        inline && "gantt-cereri-queue--inline",
        top && "gantt-cereri-queue--top",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={resolvedAriaLabel}
    >
      <header className="gantt-cereri-queue__head">
        <div>
          <h2 className="gantt-cereri-queue__title">
            {resolvedTitle}
            <span className="gantt-cereri-queue__count">{sorted.length}</span>
          </h2>
          {resolvedSubtitle && (
            <p className="gantt-cereri-queue__sub">
              {resolvedSubtitle}
            </p>
          )}
        </div>
        <Link href="/admin/bookings" className="gantt-cereri-queue__all-link">
          {inline ? tGantt("queue.allArrow") : tGantt("queue.allRequestsArrow")}
        </Link>
      </header>

      <div className="gantt-cereri-queue__scroller">
        {sorted.map((b) => {
          const label = formatGuestGanttLabel(
            b.guest_last_name,
            b.guest_first_name,
            b.guest_name
          );
          return (
            <GanttCereriCard
              key={b.id}
              href={`/admin/bookings/${b.id}`}
              label={label}
              dates={formatStayPeriod(b.check_in, b.check_out, locale)}
              party={formatGuestPartyShort(b.num_adults, b.num_children)}
            />
          );
        })}
      </div>
    </section>
  );
}
