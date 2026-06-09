import { groupConfirmedStays } from "@/domain/cazari/confirmed-buckets";
import { todayIso } from "@/lib/stay-dates";
import { StayList } from "@/components/admin/cazari/StayList";
import type { CazariLabels, OperationalStay } from "@/components/admin/cazari/types";

const BUCKET_META: Record<
  "today" | "week" | "month" | "upcoming",
  {
    title: (labels: CazariLabels, count: number) => string;
    subtitle: (labels: CazariLabels) => string;
  }
> = {
  today: {
    title: (labels, count) => labels.groupedToday(count),
    subtitle: (labels) => labels.groupedTodayHint,
  },
  week: {
    title: (labels, count) => labels.groupedThisWeek(count),
    subtitle: (labels) => labels.groupedThisWeekHint,
  },
  month: {
    title: (labels, count) => labels.groupedThisMonth(count),
    subtitle: (labels) => labels.groupedThisMonthHint,
  },
  upcoming: {
    title: (labels, count) => labels.groupedUpcoming(count),
    subtitle: (labels) => labels.groupedUpcomingHint,
  },
};

export function ConfirmedBuckets({
  items,
  today: todayProp,
  returnTo,
  hasQuery,
  labels,
}: {
  items: OperationalStay[];
  today?: string;
  returnTo: string;
  hasQuery: boolean;
  labels: CazariLabels;
}) {
  const today = todayProp ?? todayIso();
  const buckets = groupConfirmedStays(items, today);

  return (
    <div className="space-y-4">
      {buckets.map((bucket) => {
        const meta = BUCKET_META[bucket.key];
        return (
          <StayList
            key={bucket.key}
            title={meta.title(labels, bucket.stays.length)}
            subtitle={meta.subtitle(labels)}
            items={bucket.stays}
            variant="confirmate"
            returnTo={returnTo}
            hasQuery={hasQuery}
            labels={labels}
            operativeToday={today}
          />
        );
      })}
    </div>
  );
}
