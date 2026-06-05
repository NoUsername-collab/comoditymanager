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
import { RetroXpWindow } from "@/components/admin/retro/RetroXpWindow";
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

  // Dedup check — find potential duplicate guests for this booking
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
      className="max-w-2xl"
    >
      <RetroXpWindow title={booking.guest_name}>
        {/* Section 1: Header with status badge */}
        <div className="booking-header">
          <div>
            <p className="text-xs text-zinc-500">
              {tPage("bookingReference")}{" "}
              <strong className="font-mono text-zinc-700">
                {formatBookingRef(booking.id)}
              </strong>
            </p>
            <Link
              href={bookingCalendarHref(booking.check_in)}
              className="text-xs font-semibold text-emerald-700 hover:underline"
            >
              {tPage("viewInCalendar")} →
            </Link>
          </div>
          <span
            className={`booking-status-badge booking-status-badge--${booking.status}`}
          >
            {tFlow(booking.status)}
          </span>
        </div>

        {/* Guest alert banner */}
        {booking.guest_alert_level !== "normal" && (
          <div
            className={[
              "mt-4 rounded border px-3 py-3 text-sm",
              booking.guest_alert_level === "blacklist"
                ? "border-red-300 bg-red-50 text-red-950"
                : "border-amber-300 bg-amber-50 text-amber-950",
            ].join(" ")}
          >
            <GuestProfileBadges
              profile={booking.guest_profile}
              alertLevel={booking.guest_alert_level}
              alertNote={booking.guest_alert_note}
            />
          </div>
        )}

        {/* Guest profile badges (normal level) */}
        {booking.guest_alert_level === "normal" && booking.guest_profile && (
          <div className="mt-4 rounded border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm text-zinc-900">
            <p className="font-bold">{tPage("guestProfile")}</p>
            <GuestProfileBadges
              profile={booking.guest_profile}
              alertLevel={booking.guest_alert_level}
              alertNote={booking.guest_alert_note}
            />
          </div>
        )}

        {/* Section 2: Stay Details (editable) */}
        <div className="booking-section mt-4">
          <p className="booking-section__title">{tPage("stayDetails")}</p>
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

        {/* Section 3: Guest Info */}
        <div className="booking-section">
          <p className="booking-section__title">{tPage("guestInfo")}</p>
          <dl className="booking-guest-info">
            <div>
              <dt>{tPage("email")}</dt>
              <dd>{booking.guest_email}</dd>
            </div>
            <div>
              <dt>{tPage("phone")}</dt>
              <dd>{booking.guest_phone || "—"}</dd>
            </div>
            {booking.has_minor && booking.minor_age && (
              <div>
                <dt>{tPage("minorLabel")}</dt>
                <dd>{booking.minor_age}</dd>
              </div>
            )}
          </dl>
          {booking.guest_id && (
            <Link
              href={`/admin/guests/${booking.guest_id}`}
              className="mt-2 inline-block text-xs font-semibold text-emerald-700 hover:underline"
            >
              {tPage("guestProfile")} →
            </Link>
          )}
        </div>

        {/* Dedup warning */}
        {dedupCandidates.length > 0 && (
          <div className="mt-3">
            <GuestDedupWarning
              candidates={dedupCandidates}
              currentGuestId={booking.guest_id}
            />
          </div>
        )}

        {/* Section 4: Room Allocation (for requests) */}
        {canConfirm && (
          <div
            className={`booking-section ${isCancelled ? "!border-emerald-200" : ""}`}
          >
            <p className="booking-section__title">
              {isCancelled ? tPage("reacceptTitle") : tPage("confirmAllocate")}
            </p>
            {isCancelled && (
              <p className="mb-3 text-sm text-zinc-600">
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

        {/* Section 5: Operational (confirmed bookings) */}
        {booking.status === "confirmata" && (
          <>
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
          </>
        )}

        {/* Section 6: Room & Price (confirmed) */}
        {booking.status === "confirmata" && booking.room_names.length > 0 && (
          <div className="booking-section">
            <p className="booking-section__title">{tPage("roomsAndPrice")}</p>
            <p className="text-sm">
              {booking.room_names.join(", ")}
              {booking.total_price != null && (
                <strong> · {booking.total_price} RON</strong>
              )}
            </p>
            {isInvoicingAlphaEnabled() && (
              <Link
                href={`/admin/bookings/${booking.id}/factura`}
                className="mt-2 inline-block text-xs font-semibold text-emerald-700 hover:underline"
              >
                {tPage("informalDocumentAlpha")} →
              </Link>
            )}
          </div>
        )}

        {/* Section 7: Notes */}
        {booking.notes && (
          <div className="booking-section">
            <p className="booking-section__title">{tPage("message")}</p>
            <div className="booking-notes">{booking.notes}</div>
          </div>
        )}

        {/* Section 8: Activity */}
        <BookingActivitySection
          bookingId={booking.id}
          checkIn={booking.check_in}
        />

        {/* Section 9: Cancel */}
        {canCancel && (
          <div className="mt-4">
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
      </RetroXpWindow>
    </AdminRetroPageFrame>
  );
}
