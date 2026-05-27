"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { guestInitials } from "@/domain/guest-name";
import { formatGuestPartyDetail } from "@/lib/guest-party";
import { formatStayPeriod } from "@/lib/ro-calendar";
import { todayIso } from "@/lib/stay-dates";
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
  actualCheckInAt?: string | null;
  actualCheckOutAt?: string | null;
  numAdults: number;
  numChildren: number;
  checkInTime: string;
  checkOutTime: string;
  continuesBefore: boolean;
  continuesAfter: boolean;
  buildingColor?: string | null;
  roomId?: string;
  roomName?: string;
  roomNames?: string[];
  guestPhone?: string | null;
  totalPrice?: number | null;
  canMoveRoom?: boolean;
  onMoveRoom?: () => void;
};

function formatRon(value: number): string {
  return value.toLocaleString("ro-RO", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

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
  const router = useRouter();
  const isCerere = data.status === "cerere_noua";
  const stripe = data.buildingColor ?? (isCerere ? "#d97706" : "#059669");
  const initials = guestInitials(null, null, data.guestName);
  const isCheckInToday =
    !isCerere && data.checkIn === todayIso();
  const roomsLabel =
    data.roomNames && data.roomNames.length > 0
      ? data.roomNames.join(", ")
      : data.roomName ?? "—";
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
      width={320}
      className="gantt-popover-premium admin-floating-panel--gantt gantt-popover-premium--rich"
      onPanelMouseEnter={onMouseEnter}
      onPanelMouseLeave={onMouseLeave}
    >
      <div
        className="gantt-popover-premium__stripe"
        style={{ background: stripe }}
      />
      <div
        className="gantt-popover-premium__body"
        data-gantt-no-drag=""
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="flex gap-3">
          <div
            className="gantt-popover-premium__avatar shrink-0"
            style={{ background: stripe }}
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold text-zinc-900">
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

        <dl className="mt-3 space-y-1.5 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-zinc-500">Perioadă</dt>
            <dd className="text-right font-medium text-zinc-800">
              {formatStayPeriod(data.checkIn, data.checkOut, true)}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-zinc-500">Persoane</dt>
            <dd className="font-medium text-zinc-800">
              {formatGuestPartyDetail(data.numAdults, data.numChildren)}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-zinc-500">Cameră</dt>
            <dd className="max-w-[58%] truncate text-right font-medium text-zinc-800">
              {roomsLabel}
            </dd>
          </div>
          {data.guestPhone ? (
            <div className="flex justify-between gap-3">
              <dt className="text-zinc-500">Telefon</dt>
              <dd>
                <a
                  href={`tel:${data.guestPhone.replace(/\s/g, "")}`}
                  className="font-medium text-sky-700 hover:underline"
                >
                  {data.guestPhone}
                </a>
              </dd>
            </div>
          ) : null}
          {data.totalPrice != null && data.totalPrice > 0 ? (
            <div className="flex justify-between gap-3 border-t border-zinc-100 pt-1.5">
              <dt className="font-medium text-zinc-600">Preț total</dt>
              <dd className="text-base font-bold tabular-nums text-zinc-900">
                {formatRon(data.totalPrice)} RON
              </dd>
            </div>
          ) : null}
        </dl>

        <p className="mt-2 text-[11px] text-zinc-500">
          Sosire {data.checkInTime} · plecare {data.checkOutTime}
        </p>
        {(data.continuesBefore || data.continuesAfter) && (
          <p className="mt-1 text-xs text-amber-700">
            {data.continuesBefore && "← continuă din perioada anterioară "}
            {data.continuesAfter && "→ continuă în perioada următoare"}
          </p>
        )}

        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-zinc-100 pt-3">
          <button
            type="button"
            className="col-span-2 rounded-lg bg-zinc-900 px-3 py-2 text-center text-xs font-semibold text-white hover:bg-zinc-800"
            onClick={() => router.push(`/admin/bookings/${data.bookingId}`)}
          >
            Deschide
          </button>
          {data.canMoveRoom && data.onMoveRoom ? (
            <button
              type="button"
              className="rounded-lg border border-sky-200 bg-sky-50 px-2 py-2 text-center text-xs font-semibold text-sky-900 hover:bg-sky-100"
              onClick={data.onMoveRoom}
            >
              Mută cameră
            </button>
          ) : null}
          {isCheckInToday ? (
            <Link
              href={`/admin/bookings/${data.bookingId}`}
              className={[
                "rounded-lg border border-emerald-300 bg-emerald-600 px-2 py-2 text-center text-xs font-semibold text-white hover:bg-emerald-700",
                !data.canMoveRoom && "col-span-2",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              Check-in azi
            </Link>
          ) : null}
        </div>

        <details className="mt-2 text-xs">
          <summary className="cursor-pointer text-zinc-400 hover:text-zinc-600">
            Mai multe acțiuni
          </summary>
          <div className="mt-2">
            <BookingCancelButton
              label={isCerere ? "Anulează cererea" : "Anulează cazarea"}
              confirmMessage={cancelMessage}
              formAction={cancelBookingAction}
              bookingId={data.bookingId}
              returnTo="/admin/calendar"
              variant="compact"
            />
          </div>
        </details>

        <p className="mt-2 text-[10px] text-zinc-400">
          Trage bara · dublu-click deschide · click dreapta meniu
        </p>
      </div>
    </AdminFloatingPanel>
  );
}
