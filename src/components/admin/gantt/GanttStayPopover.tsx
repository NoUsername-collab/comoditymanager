"use client";

import Link from "next/link";
import { guestInitials } from "@/domain/guest-name";
import { formatGuestPartyDetail } from "@/lib/guest-party";
import { formatStayPeriod } from "@/lib/ro-calendar";
import { AdminFloatingPanel } from "@/components/admin/overlay/AdminFloatingPanel";
import { BookingCancelButton } from "@/components/admin/BookingCancelButton";
import { cancelBookingAction } from "@/app/admin/(panel)/bookings/actions";

export type GanttStayPopoverData = {
  bookingId: string;
  guestName: string;
  label: string;
  checkIn: string;
  checkOut: string;
  status: "cerere_noua" | "confirmata";
  numAdults: number;
  numChildren: number;
  checkInTime: string;
  checkOutTime: string;
  continuesBefore: boolean;
  continuesAfter: boolean;
  buildingColor?: string | null;
  roomId?: string;
  canMoveRoom?: boolean;
  onMoveRoom?: () => void;
};

export function GanttStayPopover({
  data,
  anchorRect,
  visible,
  onMouseEnter,
  onMouseLeave,
}: {
  data: GanttStayPopoverData;
  anchorRect: DOMRect | null;
  visible: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) {
  const isCerere = data.status === "cerere_noua";
  const stripe = data.buildingColor ?? (isCerere ? "#d97706" : "#059669");
  const initials = guestInitials(null, null, data.guestName);
  const cancelMessage = isCerere
    ? `Anulezi cererea ${data.guestName} · ${formatStayPeriod(data.checkIn, data.checkOut, true)}?`
    : `Anulezi cazarea confirmată ${data.guestName} · ${formatStayPeriod(data.checkIn, data.checkOut, true)}? Camerele devin libere.`;

  return (
    <AdminFloatingPanel
      open={visible && !!anchorRect}
      onClose={() => {}}
      anchorRect={anchorRect}
      variant="popover"
      showBackdrop={false}
      closeOnEscape={false}
      width={300}
      className="gantt-popover-premium admin-floating-panel--gantt"
      onPanelMouseEnter={onMouseEnter}
      onPanelMouseLeave={onMouseLeave}
    >
      <div
        className="gantt-popover-premium__stripe"
        style={{ background: stripe }}
      />
      <div className="gantt-popover-premium__body">
        <div className="flex gap-3">
          <div
            className="gantt-popover-premium__avatar shrink-0"
            style={{ background: stripe }}
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-zinc-900">
              {data.guestName}
            </p>
            <p className="text-xs text-zinc-500">{data.label}</p>
            <span
              className={[
                "mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold",
                isCerere
                  ? "bg-amber-100 text-amber-900"
                  : "bg-emerald-100 text-emerald-800",
              ].join(" ")}
            >
              {isCerere ? "Cerere nouă" : "Confirmată"}
            </span>
          </div>
        </div>

        <p className="mt-3 text-sm font-medium text-zinc-800">
          {formatStayPeriod(data.checkIn, data.checkOut, true)}
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          {formatGuestPartyDetail(data.numAdults, data.numChildren)} · sosire{" "}
          {data.checkInTime} · plecare {data.checkOutTime}
        </p>
        {(data.continuesBefore || data.continuesAfter) && (
          <p className="mt-1 text-xs text-amber-700">
            {data.continuesBefore && "← continuă din perioada anterioară "}
            {data.continuesAfter && "→ continuă în perioada următoare"}
          </p>
        )}

        <div className="mt-3 flex flex-col gap-2 border-t border-zinc-100 pt-3">
          <Link
            href={`/admin/bookings/${data.bookingId}`}
            className="rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-center text-xs font-medium text-zinc-800 hover:bg-zinc-50"
          >
            Deschide detaliu
          </Link>
          {data.canMoveRoom && data.onMoveRoom ? (
            <button
              type="button"
              className="rounded-md border border-sky-200 bg-sky-50 px-2 py-1.5 text-center text-xs font-semibold text-sky-900 hover:bg-sky-100"
              onClick={data.onMoveRoom}
            >
              Mută cameră (de azi)
            </button>
          ) : null}
          <BookingCancelButton
            label={isCerere ? "Anulează cererea" : "Anulează cazarea"}
            confirmMessage={cancelMessage}
            formAction={cancelBookingAction}
            bookingId={data.bookingId}
            returnTo="/admin/calendar"
            variant="compact"
          />
        </div>

        <p className="mt-2 text-[10px] text-zinc-400">
          Trage stânga/dreapta · dublu-click pentru rezervare
        </p>
      </div>
    </AdminFloatingPanel>
  );
}