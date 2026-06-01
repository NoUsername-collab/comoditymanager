"use client";

import { Link } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { guestInitials } from "@/domain/guest-name";
import { formatGuestPartyDetail } from "@/lib/guest-party";
import { formatStayPeriod } from "@/lib/ro-calendar";
import { todayIso } from "@/lib/stay-dates";
import { AdminFloatingPanel } from "@/components/admin/overlay/AdminFloatingPanel";
import { BookingCancelButton } from "@/components/admin/BookingCancelButton";
import { cancelBookingAction } from "@/app/[locale]/admin/(panel)/bookings/actions";

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
  today: todayProp,
}: {
  data: GanttStayPopoverData;
  anchorRect: DOMRect | null;
  visible: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  today?: string;
}) {
  const tCommon = useTranslations("admin.common");
  const tFlow = useTranslations("booking.flowStatus");
  const locale = useLocale();
  const router = useRouter();
  const effectiveToday = todayProp ?? todayIso();
  const isCerere = data.status === "cerere_noua";
  const stripe = data.buildingColor ?? (isCerere ? "#d97706" : "#059669");
  const initials = guestInitials(null, null, data.guestName);
  const isCheckInToday =
    !isCerere && data.checkIn === effectiveToday;
  const roomsLabel =
    data.roomNames && data.roomNames.length > 0
      ? data.roomNames.join(", ")
      : data.roomName ?? "—";
  const cancelMessage = isCerere
    ? tCommon("cancelRequestConfirm", {
        name: data.guestName,
        period: formatStayPeriod(data.checkIn, data.checkOut, locale, true),
      })
    : tCommon("cancelStayConfirm", {
        name: data.guestName,
        period: formatStayPeriod(data.checkIn, data.checkOut, locale, true),
      });

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
              {isCerere ? tFlow("cerere_noua") : tFlow("confirmata")}
            </span>
          </div>
        </div>

        <dl className="mt-3 space-y-1.5 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-zinc-500">{tCommon("period")}</dt>
            <dd className="text-right font-medium text-zinc-800">
              {formatStayPeriod(data.checkIn, data.checkOut, locale, true)}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-zinc-500">{tCommon("persons")}</dt>
            <dd className="font-medium text-zinc-800">
              {formatGuestPartyDetail(data.numAdults, data.numChildren)}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-zinc-500">{tCommon("room")}</dt>
            <dd className="max-w-[58%] truncate text-right font-medium text-zinc-800">
              {roomsLabel}
            </dd>
          </div>
          {data.guestPhone ? (
            <div className="flex justify-between gap-3">
              <dt className="text-zinc-500">{tCommon("phone")}</dt>
              <dd>
                <a
                  href={`tel:${data.guestPhone.replace(/\s/g, "")}`}
                  className="admin-text-action admin-text-action--accent font-medium"
                >
                  {data.guestPhone}
                </a>
              </dd>
            </div>
          ) : null}
          {data.totalPrice != null && data.totalPrice > 0 ? (
            <div className="flex justify-between gap-3 border-t border-zinc-100 pt-1.5">
              <dt className="font-medium text-zinc-600">{tCommon("totalPrice")}</dt>
              <dd className="text-base font-bold tabular-nums text-zinc-900">
                {formatRon(data.totalPrice)} RON
              </dd>
            </div>
          ) : null}
        </dl>

        <p className="mt-2 text-[11px] text-zinc-500">
          {tCommon("arrival")} {data.checkInTime} · {tCommon("departure")} {data.checkOutTime}
        </p>
        {(data.continuesBefore || data.continuesAfter) && (
          <p className="mt-1 text-xs text-amber-700">
            {data.continuesBefore && tCommon("continuesFromPrevious")}
            {data.continuesAfter && tCommon("continuesToNext")}
          </p>
        )}

        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-zinc-100 pt-3">
          <button
            type="button"
            className="col-span-2 rounded-lg bg-zinc-900 px-3 py-2 text-center text-xs font-semibold text-white transition hover:bg-zinc-800 active:translate-y-px active:bg-zinc-950"
            onClick={() => router.push(`/admin/bookings/${data.bookingId}`)}
          >
            {tCommon("openDetails")}
          </button>
          {data.canMoveRoom && data.onMoveRoom ? (
            <button
              type="button"
              className="rounded-lg border border-sky-200 bg-sky-50 px-2 py-2 text-center text-xs font-semibold text-sky-900 transition hover:bg-sky-100 active:translate-y-px active:bg-sky-200/80"
              onClick={data.onMoveRoom}
            >
              {tCommon("moveRoom")}
            </button>
          ) : null}
          {isCheckInToday ? (
            <Link
              href={`/admin/bookings/${data.bookingId}`}
              className={[
                "rounded-lg border border-emerald-300 bg-emerald-600 px-2 py-2 text-center text-xs font-semibold text-white transition hover:bg-emerald-700 active:translate-y-px active:bg-emerald-800",
                !data.canMoveRoom && "col-span-2",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {tCommon("checkInToday")}
            </Link>
          ) : null}
        </div>

        <details className="mt-2 text-xs">
          <summary className="admin-disclosure-summary text-xs text-zinc-500">
            {tCommon("quickActions")}
          </summary>
          <div className="mt-2">
            <BookingCancelButton
              label={isCerere ? tCommon("cancelRequest") : tCommon("cancelStay")}
              confirmMessage={cancelMessage}
              formAction={cancelBookingAction}
              bookingId={data.bookingId}
              returnTo="/admin/calendar"
              variant="compact"
            />
          </div>
        </details>

        <p className="mt-2 text-[10px] text-zinc-400">
          {tCommon("dragBarHint")}
        </p>
      </div>
    </AdminFloatingPanel>
  );
}
