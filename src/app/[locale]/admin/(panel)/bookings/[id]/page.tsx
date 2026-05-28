import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { formatStayPeriod } from "@/lib/ro-calendar";
import {
  bookingCalendarHref,
  formatBookingRef,
} from "@/lib/booking-admin-links";
import { BookingCancelButton } from "@/components/admin/BookingCancelButton";
import { BookingOperationalPanel } from "@/components/admin/BookingOperationalPanel";
import { BookingActivitySection } from "@/components/admin/activity/BookingActivitySection";
import { ConfirmRoomsForm } from "@/components/admin/ConfirmRoomsForm";
import { GuestDedupWarning } from "@/components/admin/guests/GuestDedupWarning";
import { GuestProfileBadges } from "@/components/admin/guests/GuestProfileBadges";
import { AdminRetroPageFrame } from "@/components/admin/retro/AdminRetroPageFrame";
import { RetroXpWindow } from "@/components/admin/retro/RetroXpWindow";
import { isInvoicingAlphaEnabled } from "@/lib/features";
import { loadBookingConfirmContext } from "@/services/booking-confirm";
import { dedupInputFromBooking, findDedupCandidates } from "@/services/guest-dedup";
import { cancelBookingAction, confirmBookingAction } from "../actions";
import { getTranslations } from "next-intl/server";

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const tPage = await getTranslations("admin.pages.bookingDetail");
  const tCommon = await getTranslations("admin.common");
  const tFlow = await getTranslations("booking.flowStatus");
  const { id } = await params;
  const ctx = await loadBookingConfirmContext(id).catch(() => null);
  if (!ctx) notFound();

  const { booking, checkInTime, checkOutTime, guestCount, availableRooms, minRoomsNeeded, canFulfill } =
    ctx;

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

  const canConfirm = booking.status === "cerere_noua";
  const canCancel = booking.status !== "anulata";
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
        <p className="text-xs text-zinc-500">
          {tPage("bookingReference")}{" "}
          <strong className="font-mono text-zinc-700">
            {formatBookingRef(booking.id)}
          </strong>
          {" · "}
          <Link
            href={bookingCalendarHref(booking.check_in)}
            className="font-semibold text-emerald-700 hover:underline"
          >
            {tPage("viewInCalendar")} →
          </Link>
        </p>
        <p className="mt-2 text-sm">
          {tPage("status")} <strong>{tFlow(booking.status)}</strong>
        </p>

        {(booking.guest_alert_level !== "normal" || booking.guest_profile) && (
          <div
            className={[
              "mt-4 rounded border px-3 py-3 text-sm",
              booking.guest_alert_level === "blacklist"
                ? "border-red-300 bg-red-50 text-red-950"
                : booking.guest_alert_level === "watchlist"
                  ? "border-amber-300 bg-amber-50 text-amber-950"
                  : "border-zinc-200 bg-zinc-50 text-zinc-900",
            ].join(" ")}
          >
            <p className="font-bold">{tPage("guestProfile")}</p>
            <GuestProfileBadges
              profile={booking.guest_profile}
              alertLevel={booking.guest_alert_level}
              alertNote={booking.guest_alert_note}
            />
          </div>
        )}

        <dl className="mt-4 grid gap-2 text-sm">
          <div>
            <dt className="font-bold">{tPage("period")}</dt>
            <dd>
              {formatStayPeriod(booking.check_in, booking.check_out, true)}
            </dd>
          </div>
          <div>
            <dt className="font-bold">{tPage("persons")}</dt>
            <dd>
              {tCommon("guestsShort", {
                adults: booking.num_adults,
                children: booking.num_children,
              })}
              {booking.has_minor && booking.minor_age
                ? ` · ${tPage("minorLabel")} ${booking.minor_age}`
                : ""}
            </dd>
          </div>
          <div>
            <dt className="font-bold">{tPage("contact")}</dt>
            <dd>
              {booking.guest_email}
              {booking.guest_phone ? ` · ${booking.guest_phone}` : ""}
            </dd>
            {booking.guest_id && (
              <dd className="mt-1">
                <Link
                  href={`/admin/guests/${booking.guest_id}`}
                  className="font-semibold text-emerald-700 hover:underline"
                >
                  {tPage("guestProfile")} →
                </Link>
              </dd>
            )}
          </div>
          {booking.notes && (
            <div>
              <dt className="font-bold">{tPage("message")}</dt>
              <dd>{booking.notes}</dd>
            </div>
          )}
        </dl>

        {dedupCandidates.length > 0 && (
          <div className="mt-4">
            <GuestDedupWarning
              candidates={dedupCandidates}
              currentGuestId={booking.guest_id}
            />
          </div>
        )}

        {canConfirm && (
          <div className="mt-6 space-y-4 border border-zinc-200 bg-white p-4">
            <h2 className="font-bold">{tPage("confirmAllocate")}</h2>
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
              action={confirmBookingAction}
            />
          </div>
        )}

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

        {booking.status === "confirmata" && (
          <BookingOperationalPanel
            bookingId={booking.id}
            guestName={booking.guest_name}
            plannedCheckIn={booking.check_in}
            plannedCheckOut={booking.check_out}
            actualCheckInAt={booking.actual_check_in_at}
            actualCheckOutAt={booking.actual_check_out_at}
          />
        )}

        {booking.status === "confirmata" && booking.room_names.length > 0 && (
          <p className="mt-4 text-sm">
            {tPage("rooms")}: {booking.room_names.join(", ")}
            {booking.total_price != null && ` · ${booking.total_price} RON`}
          </p>
        )}

        {isInvoicingAlphaEnabled() && (
          <div className="mt-4">
            <Link href={`/admin/bookings/${booking.id}/factura`}>
              {tPage("informalDocumentAlpha")} →
            </Link>
          </div>
        )}

        <BookingActivitySection
          bookingId={booking.id}
          checkIn={booking.check_in}
        />
      </RetroXpWindow>
    </AdminRetroPageFrame>
  );
}
