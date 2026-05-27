import Link from "next/link";
import { formatStayPeriod } from "@/lib/ro-calendar";
import { notFound, redirect } from "next/navigation";
import { ConfirmRoomsForm } from "@/components/admin/ConfirmRoomsForm";
import { getAdminUser } from "@/lib/auth/require-admin";
import { loadBookingConfirmContext } from "@/services/booking-confirm";
import { quickConfirmAction } from "./actions";

export default async function QuickConfirmPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await getAdminUser();
  if (!admin) {
    redirect("/admin/login?next=/calendar");
  }

  const { id } = await params;
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

  return (
    <main className="mx-auto max-w-lg flex-1 px-6 py-10">
      <Link href="/receptie" className="text-sm text-zinc-500 hover:text-zinc-800">
        ← Recepție rapidă
      </Link>

      <h1 className="mt-4 text-xl font-semibold">Confirmă rapid</h1>
      <p className="mt-1 text-sm text-zinc-600">
        {booking.guest_name} · {formatStayPeriod(booking.check_in, booking.check_out)}
      </p>

      <div
        className="mt-6 rounded-xl border bg-[var(--site-card)] p-5 shadow-sm"
        style={{
          borderColor: "var(--site-border)",
          color: "var(--site-fg)",
        }}
      >
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
          action={quickConfirmAction}
        />
      </div>

      <p className="mt-4 text-center text-xs text-zinc-400">
        <Link href="/admin" className="underline">
          Administrare
        </Link>
      </p>
    </main>
  );
}
