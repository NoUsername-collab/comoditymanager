import "@/app/admin/admin-booking-detail.css";
import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { formatStayPeriod } from "@/lib/ro-calendar";
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
import { GuestProfileBadges } from "@/components/admin/guests/GuestProfileBadges";
import { AdminRetroPageFrame } from "@/components/admin/retro/AdminRetroPageFrame";
import { isInvoicingAlphaEnabled } from "@/lib/features";
import { loadBookingConfirmContext } from "@/services/booking-confirm";
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
  const tPage = await getTranslations("admin.pages.bookingDetail");
  const tCommon = await getTranslations("admin.common");
  const tFlow = await getTranslations("booking.flowStatus");
  const { id } = await params;
  const sp = await searchParams;
  const returnTo = safeReturnTo(sp.return_to);
  const ctx = await loadBookingConfirmContext(id).catch(() => null);
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

  const dedupCandidates = await findDedupCandidates(
    dedupInputFromBooking({
      guestLastName: booking.guest_last_name ?? "",
      guestFirstName: booking.guest_first_name ?? "",
      guestEmail: booking.guest_email,
      guestPhone: booking.guest_phone ?? "",
      excludeGuestId: booking.guest_id ?? undefined,
    })
  ).catch(() => []);

  const isCancelled = booking.status === "anulata";
  const canConfirm = booking.status === "cerere_noua" || isCancelled;
  const canCancel = booking.status !== "anulata";
  const canEditDates = booking.status === "cerere_noua";
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

  return (
    <AdminRetroPageFrame
      title={`${tPage("title")} — ${booking.guest_name}`}
      backHref="/admin/bookings"
      backLabel={tCommon("requests")}
      className="max-w-6xl"
    >
      {/* ── Top banner: reference + status ─────────────────────── */}
      <div className="bd-banner">
        <div className="bd-banner__left">
          <span className="bd-banner__name">{booking.guest_name}</span>
          <span className="bd-banner__ref">
            {formatBookingRef(booking.id)}
          </span>
          <Link
            href={bookingCalendarHref(booking.check_in)}
            className="bd-banner__cal-link"
          >
            {tPage("viewInCalendar")} →
          </Link>
        </div>
        <span
          className={`bd-status bd-status--${booking.status}`}
        >
          {tFlow(booking.status)}
        </span>
      </div>

      {/* ── Guest alert banner (danger/watchlist only) ──────────── */}
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

      {/* ── Two-column main layout ─────────────────────────────── */}
      <div className="bd-grid">
        {/* ─── LEFT COLUMN: info at a glance ───────────────────── */}
        <div className="bd-col bd-col--info">
          {/* Guest profile — compact inline chips */}
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

          {/* Stay details + Guest info — merged into one card */}
          <div className="bd-card">
            <div className="bd-split-row">
              <div className="bd-split-row__section">
                <p className="bd-card__title">{tPage("stayDetails")}</p>
                <BookingStayEditor
                  bookingId={booking.id}
                  checkIn={booking.check_in}
                  checkOut={booking.check_out}
                  numAdults={booking.num_adults}
                  numChildren={booking.num_children}
                  editable={canEditDates}
                  editAction={editBookingDatesAction}
                />
              </div>
              <div className="bd-split-row__divider" />
              <div className="bd-split-row__section">
                <p className="bd-card__title">{tPage("guestInfo")}</p>
                <div className="bd-info-row">
                  <div>
                    <span className="bd-info-label">{tPage("email")}</span>
                    <span className="bd-info-value">{booking.guest_email}</span>
                  </div>
                  <div>
                    <span className="bd-info-label">{tPage("phone")}</span>
                    <span className="bd-info-value">{booking.guest_phone || "—"}</span>
                  </div>
                  {booking.has_minor && booking.minor_age && (
                    <div>
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
            </div>
          </div>

          {/* Dedup warning */}
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
              <p className="text-sm font-medium">
                {booking.room_names.join(", ")}
                {booking.total_price != null && (
                  <strong className="ml-1">· {booking.total_price} RON</strong>
                )}
              </p>
              {isInvoicingAlphaEnabled() && (
                <Link
                  href={`/admin/bookings/${booking.id}/factura`}
                  className="bd-link mt-1"
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

          {/* Cancel — bottom of left column */}
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

        {/* ─── RIGHT COLUMN: actions + history ─────────────────── */}
        <div className="bd-col bd-col--actions">
          {/* Room allocation / confirm (for new requests & cancelled) */}
          {canConfirm && (
            <div className={`bd-card bd-card--action ${isCancelled ? "bd-card--reaccept" : ""}`}>
              <p className="bd-card__title">
                {isCancelled ? tPage("reacceptTitle") : tPage("confirmAllocate")}
              </p>
              {isCancelled && (
                <p className="text-xs text-zinc-500 mb-2">
                  {tPage("reacceptHint")}
                </p>
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

          {/* Operational panel (confirmed bookings: phone, check-in/out) */}
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
                actualCheckInAt={booking.actual_check_in_at}
                actualCheckOutAt={booking.actual_check_out_at}
              />
            </div>
          )}

          {/* Activity / History — always in right column */}
          <div className="bd-card">
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
