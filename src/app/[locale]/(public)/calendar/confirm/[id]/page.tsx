import { Link } from "@/i18n/navigation";
import { formatStayPeriod } from "@/lib/ro-calendar";
import { notFound } from "next/navigation";
import { localeRedirect as redirect } from "@/i18n/server-redirect";
import { ConfirmRoomsForm } from "@/features/bookings/ui/ConfirmRoomsForm";
import { getAdminUser } from "@/lib/auth/require-admin";
import { loadBookingConfirmContext } from "@/services/booking-confirm";
import { getStayPricingRules } from "@/services/booking-rules-settings";
import { quickConfirmAction } from "./actions";
import { getTranslations } from "next-intl/server";

export default async function QuickConfirmPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [t, admin, { id }, ctx, pricingRules] = await Promise.all([
    getTranslations("public.confirm"),
    getAdminUser(),
    params,
    params.then(({ id: bookingId }) =>
      loadBookingConfirmContext(bookingId).catch(() => null)
    ),
    getStayPricingRules().catch(() => null),
  ]);

  if (!admin) {
    await redirect("/admin/login?next=/calendar");
  }
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
    <main className="public-confirm-page ml-content mx-auto max-w-lg flex-1 px-4 py-6">
      <Link href="/receptie" className="public-confirm-page__back text-sm text-zinc-500 hover:text-zinc-800">
        ← {t("backReceptie")}
      </Link>

      <h1 className="mt-4 text-xl font-semibold">{t("title")}</h1>
      <p className="mt-1 text-sm text-zinc-600">
        {booking.guest_name} · {formatStayPeriod(booking.check_in, booking.check_out)}
      </p>

      <div
        className="mt-4 rounded-xl border bg-[var(--site-card)] p-4 shadow-sm"
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
          pricingRules={pricingRules}
          defaultSelectedIds={booking.room_ids}
          action={quickConfirmAction}
        />
      </div>

      <p className="mt-4 text-center text-xs text-zinc-400">
        <Link href="/admin" className="public-confirm-page__admin-link underline">
          {t("adminLink")}
        </Link>
      </p>
    </main>
  );
}
