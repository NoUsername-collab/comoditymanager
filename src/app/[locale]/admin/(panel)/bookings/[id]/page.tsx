import "@/styles/features/admin/admin-booking-detail.css";
import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { formatStayPeriod } from "@/lib/ro-calendar";
import { stayNightCount } from "@/lib/stay-dates";
import { formatDateWithDay } from "@/lib/ro-calendar";
import {
  bookingCalendarHref,
  formatBookingRef,
} from "@/lib/booking-admin-links";
import { BookingCancelButton } from "@/features/bookings/ui/BookingCancelButton";
import { BookingGuestPhoneForm } from "@/features/bookings/ui/BookingGuestPhoneForm";
import { BookingOperationalPanel } from "@/features/bookings/ui/BookingOperationalPanel";
import { BookingActivitySection } from "@/components/admin/activity/BookingActivitySection";
import { BookingStayEditor } from "@/features/bookings/ui/BookingStayEditor";
import { ConfirmRoomsForm } from "@/features/bookings/ui/ConfirmRoomsForm";
import { GuestDedupWarning } from "@/features/guests/ui/GuestDedupWarning";
import { GuestAccessSharePanel } from "@/features/bookings/ui/GuestAccessSharePanel";
import { GuestFeedbackBadge } from "@/features/bookings/ui/GuestFeedbackBadge";
import { StayFinancialPanel } from "@/features/bookings/ui/StayFinancialPanel";
import { GuestProfileBadges } from "@/features/guests/ui/GuestProfileBadges";
import { AdminPageFrame } from "@/components/admin/shell/AdminPageFrame";
import { isBookingEditableAfterCheckout } from "@/domain/booking/post-checkout-edit";
import { loadBookingDetailPage } from "@/features/bookings/loaders";
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
  const [tPage, tCommon, tFlow, tStay, sp, data] = await Promise.all([
    getTranslations("admin.pages.bookingDetail"),
    getTranslations("admin.common"),
    getTranslations("booking.flowStatus"),
    getTranslations("admin.stayEditor"),
    searchParams,
    params.then(({ id }) => loadBookingDetailPage(id)),
  ]);
  const returnTo = safeReturnTo(sp.return_to);
  if (!data) notFound();

  const {
    ctx,
    booking,
    dedupCandidates,
    existingCheckin,
    guestFeedback,
    financialSnapshot,
    checkinSettings: effectiveCheckinSettings,
    postCheckoutPolicy,
    pricingRules,
    operativeBooking,
    checkedInRooms,
    keysHandedRooms,
    hasCheckinRecord,
    bookingForCheckin,
  } = data;
  const {
    checkInTime,
    checkOutTime,
    guestCount,
    availableRooms,
    minRoomsNeeded,
    canFulfill,
  } = ctx;

  const nights = stayNightCount(booking.check_in, booking.check_out);
  const isCancelled = booking.status === "anulata";
  const canConfirm = booking.status === "cerere_noua" || isCancelled;
  const canCancel = booking.status !== "anulata";
  const canEditDates = isBookingEditableAfterCheckout(booking, {
    memberRole: postCheckoutPolicy.memberRole,
    allowPostCheckoutEdits: postCheckoutPolicy.allowPostCheckoutEdits,
  });
  const canEditAfterCheckout = postCheckoutPolicy.canEditAfterCheckout;
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
    <AdminPageFrame
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
              {booking.status === "confirmata" && (
                <Link
                  href={`/admin/bookings/${booking.id}/factura`}
                  className="bd-link"
                >
                  {tPage("invoiceDocument")} →
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

          {/* Guest feedback */}
          {guestFeedback && (
            <div className="bd-card bd-card--tight">
              <p className="bd-card__title">{tPage("guestFeedback")}</p>
              <GuestFeedbackBadge feedback={guestFeedback} />
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
                pricingRules={pricingRules}
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
                keysHandedRooms={keysHandedRooms}
                bookingForCheckin={bookingForCheckin}
                checkinSettings={effectiveCheckinSettings}
                hasCheckinRecord={hasCheckinRecord}
                checkinId={existingCheckin?.id ?? null}
                totalPrice={booking.total_price ?? 0}
                checkinPaymentStatus={
                  financialSnapshot?.derivedStatus ??
                  existingCheckin?.payment_status ??
                  operativeBooking.checkin_payment_status ??
                  null
                }
                checkinPaymentAmountPaid={
                  financialSnapshot?.totalPaid ??
                  Number(existingCheckin?.payment_amount_paid ?? 0)
                }
                canEditAfterCheckout={canEditAfterCheckout}
              />
            </div>
          )}

          {booking.status === "confirmata" && financialSnapshot && (
            <StayFinancialPanel
              bookingId={booking.id}
              snapshot={financialSnapshot}
            />
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
    </AdminPageFrame>
  );
}
