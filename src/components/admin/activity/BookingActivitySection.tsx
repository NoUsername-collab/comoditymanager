import { ActivityTimeline } from "@/components/admin/activity/ActivityTimeline";
import type { ActivityLogEntry } from "@/domain/activity/types";
import { listBookingActivity } from "@/services/activity-log";

export async function BookingActivitySection({
  bookingId,
  checkIn,
}: {
  bookingId: string;
  checkIn: string;
}) {
  let entries: ActivityLogEntry[] = [];
  try {
    entries = await listBookingActivity(bookingId);
  } catch {
    entries = [];
  }

  return (
    <section className="admin-panel-section mt-10">
      <h2 className="admin-panel-section__title">Istoric acțiuni</h2>
      <p className="admin-panel-section__desc">
        Cronologia acestei rezervări — de la cererea de pe site până la confirmare sau
        mutare.
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
