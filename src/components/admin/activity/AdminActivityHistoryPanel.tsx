import Link from "next/link";
import { ActivityLogSummary } from "@/components/admin/activity/ActivityLogSummary";
import { ActivityJournal } from "@/components/admin/activity/ActivityJournal";
import { RetroXpWindow } from "@/components/admin/retro/RetroXpWindow";
import type { ActivityLogEntry } from "@/domain/activity/types";
import { listRecentActivity } from "@/services/activity-log";

export async function AdminActivityHistoryPanel() {
  let entries: ActivityLogEntry[] = [];
  let loadError: string | null = null;

  try {
    entries = await listRecentActivity(120);
  } catch (e) {
    loadError =
      e instanceof Error
        ? e.message
        : "Nu s-a putut încărca jurnalul. Rulează migrarea 007 în Supabase.";
  }

  return (
    <div>
      {loadError && (
        <p className="mb-4 border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
          {loadError}
        </p>
      )}

      {!loadError && entries.length > 0 && (
        <RetroXpWindow title="Rezumat" className="mb-4">
          <ActivityLogSummary entries={entries} />
        </RetroXpWindow>
      )}

      <RetroXpWindow title="Jurnal">
        <ActivityJournal entries={entries} />
      </RetroXpWindow>

      <p className="admin-tip mt-6 border border-zinc-200 bg-zinc-50 px-4 py-3 text-center text-xs">
        Fiecare rezervare are un cod unic (ex. AB12 CD34) și un ID în link — nu se
        confundă două persoane cu același nume. Anularea folosește acel ID, nu numele.
        Pentru o rezervare: deschide detaliul și vezi istoricul doar pentru acea cerere.{" "}
        <Link href="/admin/bookings">Cereri noi</Link>
        {" · "}
        <Link href="/admin/calendar">Calendar</Link>
      </p>
    </div>
  );
}
