import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { GuestRebookStayForm } from "@/components/admin/guests/GuestRebookStayForm";
import { formatStayPeriod } from "@/lib/ro-calendar";
import {
  loadGuestRebookDraft,
  previewGuestRebookRooms,
} from "@/services/guest-rebook";
import { getTranslations } from "next-intl/server";

export default async function GuestRebookStayPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; bookingId: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { id: guestId, bookingId } = await params;
  const { from } = await searchParams;
  const t = await getTranslations("admin.pages.guestRebook");

  let draft;
  try {
    draft = await loadGuestRebookDraft(guestId, bookingId);
  } catch {
    notFound();
  }

  const guestCount = draft.numAdults + draft.numChildren;
  const rooms = await previewGuestRebookRooms({
    checkIn: draft.checkIn,
    checkOut: draft.checkOut,
    numAdults: draft.numAdults,
    numChildren: draft.numChildren,
  });

  const backHref =
    from?.trim() ||
    `/admin/guests/${guestId}?tab=history`;

  return (
    <main className="guest-rebook-page mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6 space-y-2">
        <Link href={backHref} className="text-sm font-semibold text-emerald-800 hover:underline">
          ← {t("backToGuest")}
        </Link>
        <h1 className="text-2xl font-bold text-zinc-900">{t("title")}</h1>
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
        initialRooms={rooms.availableRooms}
        initialCanFulfill={rooms.canFulfill}
        initialMinRooms={rooms.minRoomsNeeded}
        checkInTime={rooms.checkInTime}
        checkOutTime={rooms.checkOutTime}
        backHref={backHref}
      />
    </main>
  );
}
