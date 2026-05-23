import { splitActivityByCategory } from "@/domain/activity/categories";
import type { ActivityLogEntry } from "@/domain/activity/types";

export function ActivityLogSummary({ entries }: { entries: ActivityLogEntry[] }) {
  const { rezervari, admin } = splitActivityByCategory(entries);

  const last = entries[0];
  const lastLabel = last
    ? new Date(last.created_at).toLocaleString("ro-RO", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  return (
    <div className="admin-history-summary admin-summary-strip">
      <div className="admin-summary-chip">
        <p className="admin-summary-chip__label">Total</p>
        <p className="admin-summary-chip__value">{entries.length}</p>
        <p className="admin-summary-chip__hint">în ultimele {entries.length} evenimente</p>
      </div>
      <div className="admin-summary-chip admin-history-summary__chip--rezervari">
        <p className="admin-summary-chip__label">Rezervări</p>
        <p className="admin-summary-chip__value">{rezervari.length}</p>
        <p className="admin-summary-chip__hint">cereri · confirmări · mutări</p>
      </div>
      <div className="admin-summary-chip admin-history-summary__chip--admin">
        <p className="admin-summary-chip__label">Admin</p>
        <p className="admin-summary-chip__value">{admin.length}</p>
        <p className="admin-summary-chip__hint">login · setări · camere</p>
      </div>
      <div className="admin-summary-chip admin-summary-chip--violet">
        <p className="admin-summary-chip__label">Cel mai recent</p>
        <p className="admin-summary-chip__value text-base">{lastLabel}</p>
        <p className="admin-summary-chip__hint">ultimul eveniment în jurnal</p>
      </div>
    </div>
  );
}
