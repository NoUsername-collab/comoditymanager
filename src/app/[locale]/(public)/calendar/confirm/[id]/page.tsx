import { Link } from "@/i18n/navigation";
import { formatStayPeriod } from "@/lib/ro-calendar";
import { notFound } from "next/navigation";
import { localeRedirect as redirect } from "@/i18n/server-redirect";
import { ConfirmRoomsForm } from "@/components/admin/ConfirmRoomsForm";
import { getAdminUser } from "@/lib/auth/require-admin";
import { loadBookingConfirmContext } from "@/services/booking-confirm";
import { quickConfirmAction } from "./actions";
import { getTranslations } from "next-intl/server";

export default async function QuickConfirmPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const t = await getTranslations("public.confirm");
  const admin = await getAdminUser();
  if (!admin) {
    await redirect("/admin/login?next=/calendar");
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
    <main className="public-confirm-page ml-content mx-auto max-w-lg flex-1 px-6 py-10">
      <Link href="/receptie" className="text-sm text-zinc-500 hover:text-zinc-800">
        ← {t("backReceptie")}
      </Link>

      <h1 className="mt-4 text-xl font-semibold">{t("title")}</h1>
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
          {t("adminLink")}
        </Link>
      </p>
    </main>
  );
}
