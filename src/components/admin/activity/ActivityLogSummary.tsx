import { splitActivityByCategory } from "@/domain/activity/categories";
import type { ActivityLogEntry } from "@/domain/activity/types";
import { getTranslations } from "next-intl/server";

export async function ActivityLogSummary({ entries }: { entries: ActivityLogEntry[] }) {
  const tActivity = await getTranslations("admin.activity");
  const tCommon = await getTranslations("admin.common");
  const { rezervari, admin } = splitActivityByCategory(entries);

  const last = entries[0];
  const lastLabel = last
    ? new Date(last.created_at).toLocaleString("ro-RO", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : tCommon("emDash");

  return (
    <div className="admin-history-summary admin-summary-strip">
      <div className="admin-summary-chip">
        <p className="admin-summary-chip__label">{tActivity("total")}</p>
        <p className="admin-summary-chip__value">{entries.length}</p>
        <p className="admin-summary-chip__hint">{tActivity("inLastEvents", { count: entries.length })}</p>
      </div>
      <div className="admin-summary-chip admin-history-summary__chip--rezervari">
        <p className="admin-summary-chip__label">{tActivity("bookings")}</p>
        <p className="admin-summary-chip__value">{rezervari.length}</p>
        <p className="admin-summary-chip__hint">{tActivity("bookingsSummaryHint")}</p>
      </div>
      <div className="admin-summary-chip admin-history-summary__chip--admin">
        <p className="admin-summary-chip__label">{tActivity("admin")}</p>
        <p className="admin-summary-chip__value">{admin.length}</p>
        <p className="admin-summary-chip__hint">{tActivity("adminSummaryHint")}</p>
      </div>
      <div className="admin-summary-chip admin-summary-chip--violet">
        <p className="admin-summary-chip__label">{tActivity("mostRecent")}</p>
        <p className="admin-summary-chip__value text-base">{lastLabel}</p>
        <p className="admin-summary-chip__hint">{tActivity("lastEventInJournal")}</p>
      </div>
    </div>
  );
}
