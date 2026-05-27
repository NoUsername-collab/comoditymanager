import { Link } from "@/i18n/navigation";
import { ActivityLogSummary } from "@/components/admin/activity/ActivityLogSummary";
import { ActivityJournal } from "@/components/admin/activity/ActivityJournal";
import { RetroXpWindow } from "@/components/admin/retro/RetroXpWindow";
import type { ActivityLogEntry } from "@/domain/activity/types";
import { listRecentActivity } from "@/services/activity-log";
import { getTranslations } from "next-intl/server";

export async function AdminActivityHistoryPanel() {
  const tActivity = await getTranslations("admin.activity");
  const tCommon = await getTranslations("admin.common");
  let entries: ActivityLogEntry[] = [];
  let loadError: string | null = null;

  try {
    entries = await listRecentActivity(120);
  } catch (e) {
    loadError =
      e instanceof Error
        ? e.message
        : tActivity("loadErrorFallback");
  }

  return (
    <div>
      {loadError && (
        <p className="mb-4 border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
          {loadError}
        </p>
      )}

      {!loadError && entries.length > 0 && (
        <RetroXpWindow title={tActivity("summaryTitle")} className="mb-4">
          <ActivityLogSummary entries={entries} />
        </RetroXpWindow>
      )}

      <RetroXpWindow title={tActivity("journalTitle")}>
        <ActivityJournal entries={entries} />
      </RetroXpWindow>

      <p className="admin-tip mt-6 border border-zinc-200 bg-zinc-50 px-4 py-3 text-center text-xs">
        {tActivity("tipText")}{" "}
        <Link href="/admin/bookings">{tActivity("newRequests")}</Link>
        {" · "}
        <Link href="/admin/calendar">{tCommon("calendar")}</Link>
      </p>
    </div>
  );
}
