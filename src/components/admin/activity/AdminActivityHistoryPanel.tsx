import { Link } from "@/i18n/navigation";
import { ActivityLogSummary } from "@/components/admin/activity/ActivityLogSummary";
import { ActivityJournal } from "@/components/admin/activity/ActivityJournal";
import { RetroXpWindow } from "@/components/admin/retro/RetroXpWindow";
import type { ActivityLogEntry } from "@/domain/activity/types";
import { listRecentActivity } from "@/services/activity-log";
import { getTranslations } from "next-intl/server";

export async function AdminActivityHistoryPanel() {
  const [tActivity, tCommon, activityResult] = await Promise.all([
    getTranslations("admin.activity"),
    getTranslations("admin.common"),
    listRecentActivity(120)
      .then((entries) => ({ ok: true as const, entries }))
      .catch((e) => ({ ok: false as const, error: e })),
  ]);

  let entries: ActivityLogEntry[] = [];
  let loadError: string | null = null;
  if (activityResult.ok) {
    entries = activityResult.entries;
  } else {
    loadError =
      activityResult.error instanceof Error
        ? activityResult.error.message
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

      <p className="admin-tip mt-4 border border-zinc-200 bg-zinc-50 px-3 py-2 text-center text-xs">
        {tActivity("tipText")}{" "}
        <Link href="/admin/bookings">{tActivity("newRequests")}</Link>
        {" · "}
        <Link href="/admin/calendar">{tCommon("calendar")}</Link>
      </p>
    </div>
  );
}
