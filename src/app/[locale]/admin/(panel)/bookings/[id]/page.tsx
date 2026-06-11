import "@/app/admin/admin-booking-detail.css";
import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { formatStayPeriod } from "@/lib/ro-calendar";
import { stayNightCount } from "@/lib/stay-dates";
import { formatDateWithDay } from "@/lib/ro-calendar";
import {
  bookingCalendarHref,
  formatBookingRef,
} from "@/lib/booking-admin-links";
import { BookingCancelButton } from "@/components/admin/BookingCancelButton";
import { BookingGuestPhoneForm } from "@/components/admin/BookingGuestPhoneForm";
import { BookingOperationalPanel } from "@/components/admin/BookingOperationalPanel";
import { BookingActivitySection } from "@/components/admin/activity/BookingActivitySection";
import { BookingStayEditor } from "@/components/admin/BookingStayEditor";
import { ConfirmRoomsForm } from "@/components/admin/ConfirmRoomsForm";
import { GuestDedupWarning } from "@/components/admin/guests/GuestDedupWarning";
import { GuestAccessSharePanel } from "@/components/admin/bookings/GuestAccessSharePanel";
import { GuestProfileBadges } from "@/components/admin/guests/GuestProfileBadges";
import { AdminRetroPageFrame } from "@/components/admin/retro/AdminRetroPageFrame";
import { isInvoicingAlphaEnabled } from "@/lib/features";
import { loadBookingConfirmContext } from "@/services/booking-confirm";
import {
  DEFAULT_CHECKIN_SETTINGS,
  getCheckinByBookingId,
  getCheckinSettings,
} from "@/services/checkin";
import { attachCheckinRecordState } from "@/services/checkin/attach-booking-state";
import type { BookingForCheckin } from "@/domain/checkin/types";
import { dedupInputFromBooking, findDedupCandidates } from "@/services/guest-dedup";
import {
  cancelBookingAction,
  confirmBookingAction,
  editBookingDatesAction,
} from "../actions";
import { getTranslations } from "next-intl/server";

function safeReturnTo(raw: string | undefined): string {
  const path = (raw ?? "").trim();
  if (!path.startsWith("/admin") || path.startsWith("//") || path.includes("://")) {
    return "/admin/cazari";
  }
  return path;
}

export default async function BookingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ return_to?: string }>;
}) {
  const ctxPromise = params.then(({ id }) =>
    loadBookingConfirmContext(id).catch(() => null)
  );
  const checkinSettingsPromise = getCheckinSettings().catch(() => null);
  const bookingExtrasPromise = ctxPromise.then((ctx) => {
    if (!ctx) {
      return {
        dedupCandidates: [] as Awaited<ReturnType<typeof findDedupCandidates>>,
        existingCheckin: null as Awaited<
          ReturnType<typeof getCheckinByBookingId>
        >,
      };
    }
    const { booking } = ctx;
    return Promise.all([
      findDedupCandidates(
        dedupInputFromBooking({
          guestLastName: booking.guest_last_name ?? "",
          guestFirstName: booking.guest_first_name ?? "",
          guestEmail: booking.guest_email,
          guestPhone: booking.guest_phone ?? "",
          excludeGuestId: booking.guest_id ?? undefined,
        })
      ).catch(() => []),
      getCheckinByBookingId(booking.id).catch(() => null),
    ]).then(([dedupCandidates, existingCheckin]) => ({
      dedupCandidates,
      existingCheckin,
    }));
  });

  const [tPage, tCommon, tFlow, tStay, sp, ctx, bookingExtras, checkinSettings] =
    await Promise.all([
      getTranslations("admin.pages.bookingDetail"),
      getTranslations("admin.common"),
      getTranslations("booking.flowStatus"),
      getTranslations("admin.stayEditor"),
      searchParams,
      ctxPromise,
      bookingExtrasPromise,
      checkinSettingsPromise,
    ]);
  const returnTo = safeReturnTo(sp.return_to);
  if (!ctx) notFound();

  const {
    booking,
    checkInTime,
    checkOutTime,
    guestCount,
    availableRooms,
    minRoomsNeeded,
    canFulfill,
  } = ctx;

  const { dedupCandidates, existingCheckin } = bookingExtras;
  const effectiveCheckinSettings = checkinSettings ?? DEFAULT_CHECKIN_SETTINGS;

  const [bookingWithCheckin] = await attachCheckinRecordState([booking]);
  const operativeBooking = bookingWithCheckin ?? booking;
  const checkedInRooms = operativeBooking.checked_in_rooms ?? [];
  const hasCheckinRecord =
    !!operativeBooking.has_checkin_record || !!existingCheckin;

  const bookingForCheckin: BookingForCheckin = {
    id: booking.id,
    status: booking.status,
    total_price: booking.total_price ?? 0,
    check_in: booking.check_in,
    check_out: booking.check_out,
    guest_name: booking.guest_name,
    guest_last_name: booking.guest_last_name ?? null,
    guest_first_name: booking.guest_first_name ?? null,
    guest_phone: booking.guest_phone ?? null,
    guest_email: booking.guest_email ?? null,
    num_adults: booking.num_adults,
    num_children: booking.num_children ?? 0,
    room_names: booking.room_names,
    checked_in_rooms: checkedInRooms,
  };

  const nights = stayNightCount(booking.check_in, booking.check_out);
  const isCancelled = booking.status === "anulata";
  const canConfirm = booking.status === "cerere_noua" || isCancelled;
  const canCancel = booking.status !== "anulata";
  const canEditDates = true;
  const checkedIn = !!booking.actual_check_in_at;
  const cancelMessage =
    booking.status === "confirmata"
      ? tPage("cancelConfirmedMsg", {
          ref: formatBookingRef(booking.id),
          name: booking.guest_name,
          period: formatStayPeriod(booking.check_in, booking.check_out, true),
        })
      : tPage("cancelRequestMsg", {
          ref: formatBookingRef(booking.id),
          name: booking.guest_name,
          period: formatStayPeriod(booking.check_in, booking.check_out, true),
        });

  const fmtCheckIn = formatDateWithDay(booking.check_in, "ro", true);
  const fmtCheckOut = formatDateWithDay(booking.check_out, "ro", true);
  const adultsLabel = `${booking.num_adults} ${booking.num_adults === 1 ? tStay("adultSingular") : tStay("adultPlural")}`;
  const childrenLabel = booking.num_children > 0
    ? `, ${booking.num_children} ${booking.num_children === 1 ? tStay("childSingular") : tStay("childPlural")}`
    : "";

  return (
    <AdminRetroPageFrame
      title={`${tPage("title")} — ${booking.guest_name}`}
      backHref="/admin/bookings"
      backLabel={tCommon("requests")}
      className="bd-page-frame"
    >
      {/* ── Top banner — all key info at a glance ──────────────── */}
      <div className={`bd-banner bd-banner--${booking.status}`}>
        {/* Row 1: name + ref + status */}
        <div className="bd-banner__top">
          <div className="bd-banner__identity">
            <span className="bd-banner__name">{booking.guest_name}</span>
            <span className="bd-banner__ref">{formatBookingRef(booking.id)}</span>
          </div>
          <span className={`bd-status bd-status--${booking.status}`}>
            {tFlow(booking.status)}
          </span>
        </div>

        {/* Row 2: stay dates + meta */}
        <div className="bd-banner__stay-row">
          <div className="bd-banner__dates">
            <span className="bd-banner__date-pair">
              <span className="bd-banner__date-label">{tStay("checkIn")}</span>
              <span className="bd-banner__date-val">{fmtCheckIn}</span>
            </span>
            <span className="bd-banner__date-sep">→</span>
            <span className="bd-banner__date-pair">
              <span className="bd-banner__date-label">{tStay("checkOut")}</span>
              <span className="bd-banner__date-val">{fmtCheckOut}</span>
            </span>
          </div>
          <div className="bd-banner__meta">
            <span className="bd-banner__nights">
              {nights} {nights === 1 ? tPage("night") : tPage("nights")}
            </span>
            <span className="bd-banner__guests">
              {adultsLabel}{childrenLabel}
            </span>
            <Link
              href={bookingCalendarHref(booking.check_in)}
              className="bd-banner__cal-link"
            >
              {tPage("viewInCalendar")} →
            </Link>
            <span className="bd-banner__edit-hint">
              <BookingStayEditor
                bookingId={booking.id}
                checkIn={booking.check_in}
                checkOut={booking.check_out}
                numAdults={booking.num_adults}
                numChildren={booking.num_children}
                editable={canEditDates}
                checkedIn={checkedIn}
                editAction={editBookingDatesAction}
              />
            </span>
          </div>
        </div>
      </div>

      {/* ── Guest alert ────────────────────────────────────────── */}
      {booking.guest_alert_level !== "normal" && (
        <div
          className={[
            "bd-alert",
            booking.guest_alert_level === "blacklist"
              ? "bd-alert--danger"
              : "bd-alert--warning",
          ].join(" ")}
        >
          <GuestProfileBadges
            profile={booking.guest_profile}
            alertLevel={booking.guest_alert_level}
            alertNote={booking.guest_alert_note}
            variant="compact"
          />
        </div>
      )}

      {/* ═══ 3-column layout ════════════════════════════════════ */}
      <div className="bd-grid3">
        {/* ─── COL 1: guest info ────────────────────────────────── */}
        <div className="bd-col">
          {/* Profile badges */}
          {booking.guest_alert_level === "normal" && booking.guest_profile && (
            <div className="bd-card bd-card--tight">
              <p className="bd-card__title">{tPage("guestProfile")}</p>
              <GuestProfileBadges
                profile={booking.guest_profile}
                alertLevel={booking.guest_alert_level}
                alertNote={booking.guest_alert_note}
                variant="compact"
              />
            </div>
          )}

          {/* Guest contact info */}
          <div className="bd-card">
            <p className="bd-card__title">{tPage("guestInfo")}</p>
            <div className="bd-info-stack">
              <div className="bd-info-item">
                <span className="bd-info-label">{tPage("email")}</span>
                <span className="bd-info-value">{booking.guest_email}</span>
              </div>
              <div className="bd-info-item">
                <span className="bd-info-label">{tPage("phone")}</span>
                <span className="bd-info-value">{booking.guest_phone || "—"}</span>
              </div>
              {booking.has_minor && booking.minor_age && (
                <div className="bd-info-item">
                  <span className="bd-info-label">{tPage("minorLabel")}</span>
                  <span className="bd-info-value">{booking.minor_age}</span>
                </div>
              )}
            </div>
            {booking.guest_id && (
              <Link
                href={`/admin/guests/${booking.guest_id}`}
                className="bd-link"
              >
                {tPage("guestProfile")} →
              </Link>
            )}
          </div>

          <GuestAccessSharePanel
            bookingId={booking.id}
            guestEmail={booking.guest_email}
            isConfirmed={booking.status === "confirmata"}
          />

          {/* Dedup */}
          {dedupCandidates.length > 0 && (
            <GuestDedupWarning
              candidates={dedupCandidates}
              currentGuestId={booking.guest_id}
            />
          )}

          {/* Room & Price (confirmed) */}
          {booking.status === "confirmata" && booking.room_names.length > 0 && (
            <div className="bd-card bd-card--tight">
              <p className="bd-card__title">{tPage("roomsAndPrice")}</p>
              <div className="bd-room-price">
                <span className="bd-room-price__rooms">
                  {booking.room_names.join(", ")}
                </span>
                {booking.total_price != null && (
                  <span className="bd-room-price__total">
                    {booking.total_price} RON
                  </span>
                )}
              </div>
              {isInvoicingAlphaEnabled() && (
                <Link
                  href={`/admin/bookings/${booking.id}/factura`}
                  className="bd-link"
                >
                  {tPage("informalDocumentAlpha")} →
                </Link>
              )}
            </div>
          )}

          {/* Notes */}
          {booking.notes && (
            <div className="bd-card bd-card--tight">
              <p className="bd-card__title">{tPage("message")}</p>
              <div className="bd-notes">{booking.notes}</div>
            </div>
          )}

          {/* Cancel */}
          {canCancel && (
            <div className="bd-cancel-zone">
              <BookingCancelButton
                label={
                  booking.status === "confirmata"
                    ? tPage("cancelConfirmed")
                    : tPage("cancelRequest")
                }
                confirmMessage={cancelMessage}
                formAction={cancelBookingAction}
                bookingId={booking.id}
                returnTo="/admin/cazari"
              />
            </div>
          )}
        </div>

        {/* ─── COL 2: actions (room selector / operational) ────── */}
        <div className="bd-col">
          {canConfirm && (
            <div className={`bd-card bd-card--action ${isCancelled ? "bd-card--reaccept" : ""}`}>
              <p className="bd-card__title">
                {isCancelled ? tPage("reacceptTitle") : tPage("confirmAllocate")}
              </p>
              {isCancelled && (
                <p className="bd-confirm__hint">{tPage("reacceptHint")}</p>
              )}
              <ConfirmRoomsForm
                bookingId={booking.id}
                checkIn={booking.check_in}
                checkOut={booking.check_out}
                guestCount={guestCount}
                minRoomsNeeded={minRoomsNeeded}
                canFulfill={canFulfill}
                availableRooms={availableRooms}
                checkInTime={checkInTime}
                checkOutTime={checkOutTime}
                defaultSelectedIds={booking.room_ids}
                returnTo={returnTo}
                submitLabel={isCancelled ? tPage("reacceptSubmit") : undefined}
                action={confirmBookingAction}
              />
            </div>
          )}

          {booking.status === "confirmata" && (
            <div className="bd-card bd-card--action">
              <BookingGuestPhoneForm
                bookingId={booking.id}
                defaultPhone={booking.guest_phone}
              />
              <BookingOperationalPanel
                bookingId={booking.id}
                guestName={booking.guest_name}
                guestPhone={booking.guest_phone}
                plannedCheckIn={booking.check_in}
                plannedCheckOut={booking.check_out}
                actualCheckInAt={
                  operativeBooking.actual_check_in_at ?? booking.actual_check_in_at
                }
                actualCheckOutAt={booking.actual_check_out_at}
                roomNames={booking.room_names}
                checkedInRooms={checkedInRooms}
                bookingForCheckin={bookingForCheckin}
                checkinSettings={effectiveCheckinSettings}
                hasCheckinRecord={hasCheckinRecord}
              />
            </div>
          )}
        </div>

        {/* ─── COL 3: activity / history ────────────────────────── */}
        <div className="bd-col">
          <div className="bd-card bd-card--history">
            <BookingActivitySection
              bookingId={booking.id}
              checkIn={booking.check_in}
            />
          </div>
        </div>
      </div>
    </AdminRetroPageFrame>
  );
}
