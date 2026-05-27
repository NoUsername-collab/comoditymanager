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
  const t = await getTranslations("admin.bookingActivity");
  let entries: ActivityLogEntry[] = [];
  try {
    entries = await listBookingActivity(bookingId);
  } catch {
    entries = [];
  }

  return (
    <section className="admin-panel-section mt-10">
      <h2 className="admin-panel-section__title">{t("title")}</h2>
      <p className="admin-panel-section__desc">
        {t("description")}
      </p>
      <div className="mt-4">
        <ActivityTimeline
          entries={entries}
          compact
          bookingCheckIn={checkIn}
        />
      </div>
    </section>
  );
}
