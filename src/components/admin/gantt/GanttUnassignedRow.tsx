"use client";

import type { BookingRow } from "@/services/bookings";
import { formatGuestGanttLabel } from "@/domain/guest-name";
import { bookingBarInRange } from "@/domain/gantt/bar-position";
import { guestPartyTotal } from "@/lib/guest-party";
import { GanttDraggableStay } from "@/components/admin/gantt/GanttDraggableStay";
import { stayTodayHighlight } from "@/domain/gantt/today-activity";
import type { GanttViewRange } from "@/domain/gantt/view-range";

const ROW_H = 44;

export function GanttUnassignedRow({
  bookings,
  viewRange,
  checkInTime,
  checkOutTime,
  compact,
  touch,
}: {
  bookings: BookingRow[];
  viewRange: GanttViewRange;
  checkInTime: string;
  checkOutTime: string;
  compact: boolean;
  touch: boolean;
}) {
  const dayCount = viewRange.days.length;
  if (bookings.length === 0) return null;

  return (
    <tr className="gantt-unassigned-row border-t border-amber-200">
      <td className="gantt-unassigned-cell sticky left-0 z-10 border-r border-amber-200/80 px-3 py-2 align-top">
        <span className="gantt-unassigned-label">Cereri fără cameră</span>
        <span className="mt-0.5 block text-[10px] font-medium text-amber-800/80">
          {bookings.length} în luna afișată · lista completă deasupra
        </span>
      </td>
      <td className="relative p-0 align-top">
        <div
          className="relative w-full overflow-hidden"
          style={{ height: ROW_H }}
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
                  "gantt-day-cell min-w-0 shadow-[inset_0_0_0_1px_#fde68a]",
                  col.isWeekend && "gantt-day-cell--weekend",
                  col.isToday && "gantt-day-cell--today",
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
                  dayCount={dayCount}
                  buildingColor="#d97706"
                  todayHighlight={stayTodayHighlight(b)}
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
