import { ActivityTimeline } from "@/components/admin/activity/ActivityTimeline";
import { getTranslations } from "next-intl/server";
import type { ActivityLogEntry } from "@/domain/activity/types";
import { listBookingActivity } from "@/services/activity-log";

export async function BookingActivitySection({
  bookingId,
  checkIn,
}: {
  bookingId: string;
  checkIn: string;
}) {
  const [t, entries] = await Promise.all([
    getTranslations("admin.bookingActivity"),
    listBookingActivity(bookingId).catch(() => [] as ActivityLogEntry[]),
  ]);

  return (
    <section className="bd-activity">
      <div className="bd-activity__header">
        <h2 className="bd-card__title" style={{ marginBottom: 0 }}>
          {t("title")}
        </h2>
        {entries.length > 0 && (
          <span className="bd-activity__count">{entries.length}</span>
        )}
      </div>
      <ActivityTimeline
        entries={entries}
        compact
        bookingCheckIn={checkIn}
      />
    </section>
  );
}
