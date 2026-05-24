import Link from "next/link";
import { formatStayPeriod } from "@/lib/ro-calendar";
import { formatRoDate } from "@/lib/stay-dates";
import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";
import { AdminRetroPageFrame } from "@/components/admin/retro/AdminRetroPageFrame";
import { RetroXpWindow } from "@/components/admin/retro/RetroXpWindow";
import { GuestSearchForm } from "@/components/admin/guests/GuestSearchForm";
import { GUEST_TAG_LABELS } from "@/domain/guest/tags";
import { listGuests } from "@/services/guests";

export default async function AdminGuestsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  let guests: Awaited<ReturnType<typeof listGuests>> = [];
  let error: string | null = null;

  try {
    guests = await listGuests(q);
  } catch (e) {
    error = e instanceof Error ? e.message : "Eroare";
  }

  return (
    <AdminRetroPageFrame
      title="Clienți — Casa Emil"
      description="Profiluri oaspeți, istoric sejururi și rebook rapid."
    >
      {error && <p className="mb-4 text-sm text-red-800">{error}</p>}

      <RetroXpWindow title="Caută client" className="mb-6">
        <GuestSearchForm defaultQuery={q} />
      </RetroXpWindow>

      <RetroXpWindow title={`Clienți (${guests.length})`}>
        {guests.length === 0 ? (
          <AdminEmptyState
            emoji="👤"
            title={q ? "Niciun client găsit" : "Niciun client încă"}
            description={
              q
                ? "Încearcă alt termen de căutare."
                : "Clienții apar automat când se trimit cereri sau se creează cazări."
            }
          />
        ) : (
          <ul className="space-y-2">
            {guests.map((g) => (
              <li
                key={g.id}
                className="flex flex-wrap items-center justify-between gap-3 border border-zinc-200 bg-white px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{g.display_name}</p>
                  <p className="text-sm text-zinc-600">
                    {[g.email, g.phone].filter(Boolean).join(" · ") || "—"}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {g.booking_count} sejur{g.booking_count === 1 ? "" : "uri"}
                    {g.last_stay_check_out
                      ? ` · ultimul checkout ${formatRoDate(g.last_stay_check_out)}`
                      : ""}
                  </p>
                  {g.tags.length > 0 && (
                    <p className="mt-1 text-xs text-amber-800">
                      {g.tags.map((t) => GUEST_TAG_LABELS[t]).join(" · ")}
                    </p>
                  )}
                </div>
                <Link
                  href={`/admin/guests/${g.id}`}
                  className="admin-cereri-fill shrink-0 px-4 py-2 text-sm font-medium"
                >
                  Profil
                </Link>
              </li>
            ))}
          </ul>
        )}
      </RetroXpWindow>
    </AdminRetroPageFrame>
  );
}
