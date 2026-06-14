"use client";

import type { BookingRow } from "@/services/bookings";
import { useTranslations } from "next-intl";
import { formatGuestGanttLabel } from "@/domain/guest-name";
import { bookingBarInRange } from "@/domain/gantt/bar-position";
import { guestPartyTotal } from "@/lib/guest-party";
import { GanttDraggableStay } from "@/components/admin/gantt/GanttDraggableStay";
import { occupancyPhase } from "@/domain/occupancy/phase";
import { stayTodayHighlight } from "@/domain/gantt/today-activity";
import type { GanttViewRange } from "@/domain/gantt/view-range";

import { GANTT_UNASSIGNED_ROW_H } from "@/domain/gantt/layout";

export function GanttUnassignedRow({
  bookings,
  viewRange,
  checkInTime,
  checkOutTime,
}: {
  bookings: BookingRow[];
  viewRange: GanttViewRange;
  checkInTime: string;
  checkOutTime: string;
}) {
  const tGantt = useTranslations("admin.gantt");
  const dayCount = viewRange.days.length;
  const today =
    viewRange.days.find((d) => d.isToday)?.iso ?? viewRange.days[0]?.iso ?? "";
  if (bookings.length === 0) return null;

  return (
    <tr className="gantt-unassigned-row border-t border-amber-200">
      <td className="gantt-unassigned-cell sticky left-0 z-10 border-r border-amber-200/80 px-3 py-2 align-top">
        <span className="gantt-unassigned-label">{tGantt("queue.requestsNoRoom")}</span>
        <span className="mt-0.5 block text-[10px] font-medium text-amber-800/80">
          {tGantt("unassigned.countInTimeline", { count: bookings.length })}
        </span>
      </td>
      <td className="relative p-0 align-top">
        <div
          className="relative w-full overflow-hidden"
          style={{ height: GANTT_UNASSIGNED_ROW_H }}
        >
          <div
            className="gantt-day-grid gantt-day-grid--timed grid h-full w-full min-w-0 opacity-60"
            style={{
              gridTemplateColumns: `repeat(${dayCount}, minmax(0, 1fr))`,
            }}
          >
            {viewRange.days.map((col) => (
              <div
                key={col.iso}
                className={[
                  "gantt-day-cell min-w-0 shadow-[inset_0_0_0_1px_var(--pending-border)]",
                  col.isWeekend && "gantt-day-cell--weekend",
                  col.isToday && "gantt-day-cell--today",
                  col.isPast && "gantt-day-cell--past",
                ]
                  .filter(Boolean)
                  .join(" ")}
              />
            ))}
          </div>
          <div className="gantt-stays-layer absolute inset-0 z-[2]">
            {bookings.map((b) => {
              const pos = bookingBarInRange(
                b.check_in,
                b.check_out,
                viewRange.rangeStart,
                viewRange.rangeEnd,
                dayCount,
                checkInTime,
                checkOutTime
              );
              if (!pos || pos.widthPct <= 0) return null;
              const label = formatGuestGanttLabel(
                b.guest_last_name,
                b.guest_first_name,
                b.guest_name
              );
              return (
                <GanttDraggableStay
                  key={b.id}
                  href={`/admin/bookings/${b.id}`}
                  label={label}
                  pos={pos}
                  isCerere
                  guestTotal={guestPartyTotal(b.num_adults, b.num_children)}
                  bookingId={b.id}
                  bookingCheckIn={b.check_in}
                  dayCount={dayCount}
                  buildingColor="var(--pending-border)"
                  todayHighlight={stayTodayHighlight(b)}
                  occupancyPhase={occupancyPhase(b.check_in, b.check_out, today)}
                  roomIds={b.room_ids ?? []}
                  today={today}
                  popover={{
                    bookingId: b.id,
                    guestName: b.guest_name,
                    label,
                    checkIn: b.check_in,
                    checkOut: b.check_out,
                    status: b.status as "cerere_noua" | "confirmata",
                    numAdults: b.num_adults,
                    numChildren: b.num_children,
                    checkInTime,
                    checkOutTime,
                    continuesBefore: pos.continuesBefore,
                    continuesAfter: pos.continuesAfter,
                    buildingColor: "#d97706",
                  }}
                />
              );
            })}
          </div>
        </div>
      </td>
    </tr>
  );
}
