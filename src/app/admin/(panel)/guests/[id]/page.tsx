import Link from "next/link";
import { notFound } from "next/navigation";
import { formatStayPeriod } from "@/lib/ro-calendar";
import { formatBookingRef } from "@/lib/booking-admin-links";
import { GuestMergeForm } from "@/components/admin/guests/GuestMergeForm";
import { GuestNotesForm } from "@/components/admin/guests/GuestNotesForm";
import { GuestRebookButtons } from "@/components/admin/guests/GuestRebookButtons";
import { GuestTagsForm } from "@/components/admin/guests/GuestTagsForm";
import { AdminRetroPageFrame } from "@/components/admin/retro/AdminRetroPageFrame";
import { RetroXpWindow } from "@/components/admin/retro/RetroXpWindow";
import { GUEST_TAG_LABELS } from "@/domain/guest/tags";
import {
  findDuplicateGuestsForGuest,
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
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const guest = await getGuestById(id).catch(() => null);
  if (!guest) notFound();

  const [history, duplicates] = await Promise.all([
    getGuestBookingHistory(id).catch(() => []),
    findDuplicateGuestsForGuest(id).catch(() => []),
  ]);

  return (
    <AdminRetroPageFrame
      title={`Client — ${guest.display_name}`}
      backHref="/admin/guests"
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
          {guest.tags.length > 0 && (
            <div>
              <dt className="font-bold">Etichete</dt>
              <dd>{guest.tags.map((t) => GUEST_TAG_LABELS[t]).join(", ")}</dd>
            </div>
          )}
        </dl>

        <GuestMergeForm guestId={guest.id} duplicates={duplicates} />

        <div className="mt-6 space-y-2">
          <h2 className="font-bold">Etichete</h2>
          <GuestTagsForm guestId={guest.id} initialTags={guest.tags} />
        </div>

        <div className="mt-6 space-y-2">
          <h2 className="font-bold">Note interne</h2>
          <GuestNotesForm guestId={guest.id} initialNotes={guest.notes ?? ""} />
        </div>

        <div className="mt-6 space-y-2">
          <h2 className="font-bold">Rebook</h2>
          <p className="text-xs text-zinc-500">
            Creează cerere nouă pe baza ultimului sejur (camere + persoane).
          </p>
          <GuestRebookButtons guestId={guest.id} />
        </div>
      </RetroXpWindow>

      <RetroXpWindow title={`Istoric sejururi (${history.length})`} className="mt-6">
        {history.length === 0 ? (
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
              </li>
            ))}
          </ul>
        )}
      </RetroXpWindow>
    </AdminRetroPageFrame>
  );
}
