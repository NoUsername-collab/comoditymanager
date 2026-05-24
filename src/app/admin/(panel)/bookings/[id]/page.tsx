import Link from "next/link";
import { notFound } from "next/navigation";
import { formatStayPeriod } from "@/lib/ro-calendar";
import {
  bookingCalendarHref,
  formatBookingRef,
} from "@/lib/booking-admin-links";
import { BookingCancelButton } from "@/components/admin/BookingCancelButton";
import { BookingActivitySection } from "@/components/admin/activity/BookingActivitySection";
import { ConfirmRoomsForm } from "@/components/admin/ConfirmRoomsForm";
import { AdminRetroPageFrame } from "@/components/admin/retro/AdminRetroPageFrame";
import { RetroXpWindow } from "@/components/admin/retro/RetroXpWindow";
import { isInvoicingAlphaEnabled } from "@/lib/features";
import { loadBookingConfirmContext } from "@/services/booking-confirm";
import { cancelBookingAction, confirmBookingAction } from "../actions";

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await loadBookingConfirmContext(id).catch(() => null);
  if (!ctx) notFound();

  const { booking, checkInTime, checkOutTime, guestCount, availableRooms, minRoomsNeeded, canFulfill } =
    ctx;

  const canConfirm = booking.status === "cerere_noua";
  const canCancel = booking.status !== "anulata";
  const cancelMessage =
    booking.status === "confirmata"
      ? `Anulezi cazarea confirmată ${formatBookingRef(booking.id)} · ${booking.guest_name} · ${formatStayPeriod(booking.check_in, booking.check_out, true)}? Camerele devin din nou libere.`
      : `Anulezi cererea ${formatBookingRef(booking.id)} · ${booking.guest_name} · ${formatStayPeriod(booking.check_in, booking.check_out, true)}? Rezervarea rămâne în istoric (status anulată).`;

  return (
    <AdminRetroPageFrame
      title={`Rezervare — ${booking.guest_name}`}
      backHref="/admin/bookings"
      backLabel="Cereri"
      className="max-w-2xl"
    >
      <RetroXpWindow title={booking.guest_name}>
        <p className="text-xs text-zinc-500">
          Referință unică:{" "}
          <strong className="font-mono text-zinc-700">
            {formatBookingRef(booking.id)}
          </strong>
          {" · "}
          <Link
            href={bookingCalendarHref(booking.check_in)}
            className="font-semibold text-emerald-700 hover:underline"
          >
            Vezi în calendar →
          </Link>
        </p>
        <p className="mt-2 text-sm">
          Status: <strong>{booking.status}</strong>
        </p>

        <dl className="mt-4 grid gap-2 text-sm">
          <div>
            <dt className="font-bold">Perioadă</dt>
            <dd>
              {formatStayPeriod(booking.check_in, booking.check_out, true)}
            </dd>
          </div>
          <div>
            <dt className="font-bold">Persoane</dt>
            <dd>
              {booking.num_adults} adulți, {booking.num_children} copii
              {booking.has_minor && booking.minor_age
                ? ` · minor ${booking.minor_age}`
                : ""}
            </dd>
          </div>
          <div>
            <dt className="font-bold">Contact</dt>
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
                  Profil client →
                </Link>
              </dd>
            )}
          </div>
          {booking.notes && (
            <div>
              <dt className="font-bold">Mesaj</dt>
              <dd>{booking.notes}</dd>
            </div>
          )}
        </dl>

        {canConfirm && (
          <div className="mt-6 space-y-4 border border-zinc-200 bg-white p-4">
            <h2 className="font-bold">Confirmă și alocă camere</h2>
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
                  ? "Anulează cazarea confirmată"
                  : "Anulează cererea"
              }
              confirmMessage={cancelMessage}
              formAction={cancelBookingAction}
              bookingId={booking.id}
              returnTo="/admin/cazari"
            />
          </div>
        )}

        {booking.status === "confirmata" && booking.room_names.length > 0 && (
          <p className="mt-4 text-sm">
            Camere: {booking.room_names.join(", ")}
            {booking.total_price != null && ` · ${booking.total_price} RON`}
          </p>
        )}

        {isInvoicingAlphaEnabled() && (
          <div className="mt-4">
            <Link href={`/admin/bookings/${booking.id}/factura`}>
              Document informativ (Alpha) →
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
