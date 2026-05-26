import Link from "next/link";
import { notFound } from "next/navigation";
import { formatStayPeriod } from "@/lib/ro-calendar";
import { formatBookingRef } from "@/lib/booking-admin-links";
import { GuestMergeForm } from "@/components/admin/guests/GuestMergeForm";
import { GuestNotesForm } from "@/components/admin/guests/GuestNotesForm";
import { GuestProfileBadges } from "@/components/admin/guests/GuestProfileBadges";
import { GuestProfileCards } from "@/components/admin/guests/GuestProfileCards";
import { GuestProfileControlsForm } from "@/components/admin/guests/GuestProfileControlsForm";
import { GuestRebookButtons } from "@/components/admin/guests/GuestRebookButtons";
import { GuestStayReviewForm } from "@/components/admin/guests/GuestStayReviewForm";
import { AdminRetroPageFrame } from "@/components/admin/retro/AdminRetroPageFrame";
import { RetroXpWindow } from "@/components/admin/retro/RetroXpWindow";
import { GUEST_TAG_LABELS } from "@/domain/guest/tags";
import { GUEST_NEGATIVE_TRAIT_LABELS, GUEST_POSITIVE_TRAIT_LABELS } from "@/domain/guest/reputation";
import { todayIso } from "@/lib/stay-dates";
import {
  findDuplicateGuestsForGuest,
  getGuestBaseById,
  getGuestBookingHistory,
  getGuestById,
} from "@/services/guests";

function statusLabel(status: string): string {
  if (status === "confirmata") return "Confirmată";
  if (status === "cerere_noua") return "Cerere";
  if (status === "anulata") return "Anulată";
  return status;
}

export default async function GuestDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { id } = await params;
  const { from } = await searchParams;
  const baseGuest = await getGuestBaseById(id);
  if (!baseGuest) notFound();

  let guest = await getGuestById(id).catch(() => null);
  let profileError: string | null = null;
  if (!guest) {
    guest = baseGuest;
    profileError = "Snapshot-ul de profil nu a putut fi încărcat acum.";
  }

  let history = [] as Awaited<ReturnType<typeof getGuestBookingHistory>>;
  let historyError: string | null = null;
  try {
    history = await getGuestBookingHistory(id);
  } catch (e) {
    historyError = e instanceof Error ? e.message : "Nu pot încărca istoricul.";
  }

  let duplicates = [] as Awaited<ReturnType<typeof findDuplicateGuestsForGuest>>;
  let duplicatesError: string | null = null;
  try {
    duplicates = await findDuplicateGuestsForGuest(id);
  } catch (e) {
    duplicatesError = e instanceof Error ? e.message : "Nu pot încărca duplicatele.";
  }
  const today = todayIso();
  const backHref = from?.startsWith("/admin/guests") ? from : "/admin/guests";

  return (
    <AdminRetroPageFrame
      title={`Client — ${guest.display_name}`}
      backHref={backHref}
      backLabel="Clienți"
      className="max-w-3xl"
    >
      <RetroXpWindow title={guest.display_name}>
        <dl className="grid gap-2 text-sm">
          <div>
            <dt className="font-bold">Contact</dt>
            <dd>
              {guest.email ?? "—"}
              {guest.phone ? ` · ${guest.phone}` : ""}
            </dd>
          </div>
          {guest.profile && (
            <div>
              <dt className="font-bold">Snapshot profil</dt>
              <dd>
                <GuestProfileBadges profile={guest.profile} />
              </dd>
            </div>
          )}
          {guest.tags.length > 0 && (
            <div>
              <dt className="font-bold">Legacy tags</dt>
              <dd>{guest.tags.map((t) => GUEST_TAG_LABELS[t]).join(", ")}</dd>
            </div>
          )}
        </dl>

        <GuestMergeForm guestId={guest.id} duplicates={duplicates} />
        {duplicatesError && (
          <p className="mt-3 text-xs text-amber-800">{duplicatesError}</p>
        )}

        <div className="mt-6 space-y-2">
          <h2 className="font-bold">Profil Client v2</h2>
          {profileError && <p className="text-xs text-amber-800">{profileError}</p>}
          <GuestProfileCards profile={guest.profile} />
        </div>

        <div className="mt-6 space-y-2">
          <h2 className="font-bold">Blacklist / ajustări scor</h2>
          <GuestProfileControlsForm guestId={guest.id} profile={guest.profile} />
        </div>

        <div className="mt-6 space-y-2">
          <h2 className="font-bold">Note interne generale</h2>
          <GuestNotesForm guestId={guest.id} initialNotes={guest.notes ?? ""} />
        </div>

        <div className="mt-6 space-y-2">
          <h2 className="font-bold">Rebook</h2>
          <p className="text-xs text-zinc-500">
            Creează cerere nouă pe baza ultimului sejur (camere + persoane).
          </p>
          <GuestRebookButtons guestId={guest.id} disabled={history.length === 0} />
          {history.length === 0 && !historyError && (
            <p className="text-xs text-zinc-500">
              Rebook devine disponibil după primul sejur legat profilului.
            </p>
          )}
        </div>
      </RetroXpWindow>

      <RetroXpWindow title={`Istoric sejururi (${history.length})`} className="mt-6">
        {historyError ? (
          <p className="text-sm text-amber-800">{historyError}</p>
        ) : history.length === 0 ? (
          <p className="text-sm text-zinc-500">Niciun sejur legat încă.</p>
        ) : (
          <ul className="space-y-3">
            {history.map((stay) => (
              <li
                key={stay.id}
                className="border border-zinc-200 bg-white px-4 py-3 text-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">
                      {formatStayPeriod(stay.check_in, stay.check_out, true)}
                    </p>
                    <p className="text-zinc-600">
                      {statusLabel(stay.status)}
                      {stay.room_names.length > 0
                        ? ` · ${stay.room_names.join(", ")}`
                        : ""}
                      {stay.total_price != null ? ` · ${stay.total_price} RON` : ""}
                    </p>
                    <p className="text-xs text-zinc-400 font-mono">
                      {formatBookingRef(stay.id)}
                    </p>
                    {stay.review && (
                      <div className="mt-2 space-y-1 text-xs">
                        <p className="font-semibold text-violet-800">
                          Review: {stay.review.stars} stele
                          {stay.review.problem_details ? " · are detalii" : ""}
                        </p>
                        {(stay.review.positive_traits.length > 0 ||
                          stay.review.negative_traits.length > 0) && (
                          <p className="text-zinc-600">
                            {stay.review.positive_traits.map(
                              (trait) => GUEST_POSITIVE_TRAIT_LABELS[trait]
                            ).join(" · ")}
                            {stay.review.positive_traits.length > 0 &&
                            stay.review.negative_traits.length > 0
                              ? " | "
                              : ""}
                            {stay.review.negative_traits.map(
                              (trait) => GUEST_NEGATIVE_TRAIT_LABELS[trait]
                            ).join(" · ")}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  <Link
                    href={`/admin/bookings/${stay.id}`}
                    className="text-sm font-semibold text-emerald-700 hover:underline"
                  >
                    Detalii →
                  </Link>
                </div>
                {stay.segments.length > 1 && (
                  <ul className="mt-2 space-y-1 border-t border-zinc-100 pt-2 text-xs text-zinc-600">
                    {stay.segments.map((seg) => (
                      <li key={seg.id}>
                        Segment {formatStayPeriod(seg.segment_start, seg.segment_end, true)}
                        {seg.nightly_rate != null
                          ? ` · ${seg.nightly_rate} RON/noapte`
                          : ""}
                      </li>
                    ))}
                  </ul>
                )}
                {stay.status === "confirmata" && stay.check_out < today && (
                  <GuestStayReviewForm
                    guestId={guest.id}
                    bookingId={stay.id}
                    review={stay.review}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </RetroXpWindow>
    </AdminRetroPageFrame>
  );
}
