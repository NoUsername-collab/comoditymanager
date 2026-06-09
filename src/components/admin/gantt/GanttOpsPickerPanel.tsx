"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AdminPortal } from "@/components/admin/overlay/AdminPortal";
import { filterBookingsForOperativeCheckIn } from "@/domain/booking/operative-checkin";
import { formatStayPeriod } from "@/lib/ro-calendar";
import { todayIso } from "@/lib/stay-dates";
import type { BookingRow } from "@/services/bookings";

export type GanttOpsPickerMode = "checkin" | "checkout";

type Props = {
  open: boolean;
  mode: GanttOpsPickerMode;
  bookings: BookingRow[];
  onClose: () => void;
  onSelect: (booking: BookingRow) => void;
  today?: string;
};

function filterForMode(
  bookings: BookingRow[],
  mode: GanttOpsPickerMode,
  today: string = todayIso()
): BookingRow[] {
  if (mode === "checkin") {
    return filterBookingsForOperativeCheckIn(bookings, today).sort((a, b) =>
      a.guest_name.localeCompare(b.guest_name, "ro")
    );
  }
  return bookings
    .filter((b) => b.status === "confirmata")
    .filter((b) => Boolean(b.actual_check_in_at) && !b.actual_check_out_at)
    .sort((a, b) => a.guest_name.localeCompare(b.guest_name, "ro"));
}

export function GanttOpsPickerPanel({
  open,
  mode,
  bookings,
  onClose,
  onSelect,
  today: todayProp,
}: Props) {
  const tCommon = useTranslations("admin.common");
  const tGantt = useTranslations("admin.gantt");
  const locale = useLocale();
  const rows = useMemo(() => filterForMode(bookings, mode, todayProp), [bookings, mode, todayProp]);

  if (!open) return null;

  const title = mode === "checkin" ? tGantt("opsPicker.checkInToday") : tGantt("opsPicker.checkOut");

  return (
    <AdminPortal>
      <button
        type="button"
        className="fixed inset-0 z-[210] bg-black/30"
        aria-label={tCommon("close")}
        onClick={onClose}
      />
      <div
        className="fixed left-1/2 top-[18%] z-[211] max-h-[min(70vh,28rem)] w-[min(24rem,92vw)] -translate-x-1/2 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl"
        role="dialog"
        aria-label={title}
      >
        <div className="border-b border-zinc-100 px-4 py-3">
          <h2 className="text-sm font-bold text-zinc-900">{title}</h2>
          <p className="mt-0.5 text-[11px] text-zinc-500">
            {tGantt("opsPicker.chooseThenConfirm")}
          </p>
        </div>
        <ul className="max-h-[min(52vh,22rem)] overflow-y-auto p-2">
          {rows.length === 0 ? (
            <li className="px-3 py-4 text-center text-xs text-zinc-500">
              {mode === "checkin"
                ? tGantt("opsPicker.noCheckIn")
                : tGantt("opsPicker.noCheckOut")}
            </li>
          ) : (
            rows.map((b) => (
              <li key={b.id}>
                <button
                  type="button"
                  className="w-full rounded-lg px-3 py-2.5 text-left hover:bg-zinc-50"
                  onClick={() => {
                    onSelect(b);
                    onClose();
                  }}
                >
                  <span className="block text-sm font-semibold text-zinc-900">
                    {b.guest_name}
                  </span>
                  <span className="block text-[11px] text-zinc-500">
                    {formatStayPeriod(b.check_in, b.check_out, locale, true)}
                    {b.room_names.length > 0
                      ? ` · ${b.room_names.join(", ")}`
                      : ""}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
        <div className="border-t border-zinc-100 px-4 py-2">
          <button
            type="button"
            className="admin-text-action admin-text-action--neutral text-xs"
            onClick={onClose}
          >
            {tCommon("close")}
          </button>
        </div>
      </div>
    </AdminPortal>
  );
}
