"use client";

import Link from "next/link";
import { useMemo } from "react";
import { formatGuestGanttLabel } from "@/domain/guest-name";
import { ganttStaySurface } from "@/lib/gantt-stay-surface";
import { GanttCereriCard } from "@/components/admin/gantt/GanttCereriCard";
import { formatGuestPartyShort } from "@/lib/guest-party";
import { formatStayPeriod } from "@/lib/ro-calendar";
import type { BookingRow } from "@/services/bookings";

const CERERE_ACCENT = "#d97706";

export function GanttCereriQueue({
  cereri,
  embedded = false,
}: {
  cereri: BookingRow[];
  /** În interiorul panoului toolbar — fără chenar separat */
  embedded?: boolean;
}) {
  const surface = useMemo(() => ganttStaySurface(CERERE_ACCENT, true), []);

  const sorted = useMemo(
    () =>
      [...cereri].sort((a, b) =>
        a.check_in.localeCompare(b.check_in) || a.check_out.localeCompare(b.check_out)
      ),
    [cereri]
  );

  if (sorted.length === 0) return null;

  return (
    <section
      id="gantt-cereri-queue"
      className={[
        "gantt-cereri-queue",
        embedded && "gantt-cereri-queue--embedded",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label="Cereri fără cameră"
    >
      <header className="gantt-cereri-queue__head">
        <div>
          <h2 className="gantt-cereri-queue__title">
            Cereri fără cameră
            <span className="gantt-cereri-queue__count">{sorted.length}</span>
          </h2>
          <p className="gantt-cereri-queue__sub">
            Vizibile indiferent de luna din calendar — procesează și alocă camere
          </p>
        </div>
        <Link href="/admin/bookings" className="gantt-cereri-queue__all-link">
          Toate cererile →
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
              surface={surface}
              label={label}
              dates={formatStayPeriod(b.check_in, b.check_out)}
              party={formatGuestPartyShort(b.num_adults, b.num_children)}
            />
          );
        })}
      </div>
    </section>
  );
}
