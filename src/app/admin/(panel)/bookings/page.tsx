import Link from "next/link";
import { formatStayPeriod } from "@/lib/ro-calendar";
import { GuestProfileBadges } from "@/components/admin/guests/GuestProfileBadges";
import { listCereriNoi } from "@/services/bookings";
import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";
import { AdminRetroPageFrame } from "@/components/admin/retro/AdminRetroPageFrame";
import { RetroXpWindow } from "@/components/admin/retro/RetroXpWindow";

export default async function AdminBookingsPage() {
  let cereri: Awaited<ReturnType<typeof listCereriNoi>> = [];
  let error: string | null = null;

  try {
    cereri = await listCereriNoi();
  } catch (e) {
    error = e instanceof Error ? e.message : "Eroare";
  }

  return (
    <AdminRetroPageFrame
      title="Cereri noi — Casa Emil"
      description="Confirmă disponibilitatea și alocă camerele."
    >
      <RetroXpWindow title={`Cereri noi (${cereri.length})`}>
        {error && <p className="text-sm text-red-800">{error}</p>}

        <ul className="space-y-2">
          {cereri.map((c) => (
            <li
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-3 border border-zinc-200 bg-white px-4 py-3"
            >
              <div>
                <p className="font-semibold">{c.guest_name}</p>
                <p className="text-sm">
                  {formatStayPeriod(c.check_in, c.check_out)} · {c.num_adults} ad. +{" "}
                  {c.num_children} cop.
                </p>
                <p className="text-xs">{c.guest_email}</p>
                <GuestProfileBadges
                  profile={c.guest_profile}
                  alertLevel={c.guest_alert_level}
                  alertNote={c.guest_alert_note}
                />
              </div>
              <Link
                href={`/admin/bookings/${c.id}`}
                className="admin-cereri-fill px-4 py-2 text-sm font-medium"
              >
                Procesează
              </Link>
            </li>
          ))}
        </ul>

        {cereri.length === 0 && !error && (
          <AdminEmptyState
            emoji="✨"
            title="Nicio cerere nouă"
            description="Totul e la zi — poți respira. Când vine o cerere de pe site, apare aici cu glow roșu."
            actionHref="/calendar"
            actionLabel="Vezi calendarul public"
          />
        )}
      </RetroXpWindow>
    </AdminRetroPageFrame>
  );
}
