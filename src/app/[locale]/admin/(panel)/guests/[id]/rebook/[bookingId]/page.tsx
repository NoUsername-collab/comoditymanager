import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { GuestRebookStayForm } from "@/features/guests/ui/GuestRebookStayForm";
import { formatStayPeriod } from "@/lib/ro-calendar";
import { loadGuestRebookPanelPayload } from "@/services/guest-rebook";
import { getTranslations } from "next-intl/server";

export default async function GuestRebookStayPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; bookingId: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const [t, { id: guestId, bookingId }, { from }, payload] = await Promise.all([
    getTranslations("admin.pages.guestRebook"),
    params,
    searchParams,
    params.then(({ id, bookingId: sourceBookingId }) =>
      loadGuestRebookPanelPayload(id, sourceBookingId)
    ),
  ]);

  if (!payload) notFound();

  const {
    draft,
    initialRooms,
    initialCanFulfill,
    initialMinRooms,
    checkInTime,
    checkOutTime,
  } = payload;

  const backHref =
    from?.trim() ||
    `/admin/guests/${guestId}?tab=history`;

  return (
    <main className="guest-rebook-page ml-content mx-auto max-w-3xl px-4 py-5">
      <header className="mb-4 space-y-1">
        <Link
          href={backHref}
          className="guest-rebook-page__back inline-flex min-h-[var(--ml-touch-min,2.75rem)] items-center text-sm font-semibold text-emerald-800 hover:underline"
        >
          ← {t("backToGuest")}
        </Link>
        <h1 className="text-xl font-bold text-zinc-900">{t("title")}</h1>
        <p className="text-sm text-zinc-600">
          {t("subtitle", {
            name: draft.guestDisplayName,
            period: formatStayPeriod(
              draft.sourceCheckIn,
              draft.sourceCheckOut,
              true
            ),
          })}
        </p>
      </header>

      <GuestRebookStayForm
        draft={draft}
        initialRooms={initialRooms}
        initialCanFulfill={initialCanFulfill}
        initialMinRooms={initialMinRooms}
        checkInTime={checkInTime}
        checkOutTime={checkOutTime}
        backHref={backHref}
      />
    </main>
  );
}
