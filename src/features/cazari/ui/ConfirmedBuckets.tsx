"use client";

import { groupConfirmedStays, isConfirmedBucketExpandedByDefault } from "@/domain/cazari/confirmed-buckets";
import { todayIso } from "@/lib/stay-dates";
import { formatCazariLabel } from "@/lib/cazari-label-format";
import { StayList } from "@/features/cazari/ui/StayList";
import type { CazariLabels, OperationalStay } from "@/features/cazari/ui/types";

const BUCKET_META: Record<
  "today" | "week" | "month" | "upcoming",
  {
    titleKey: keyof Pick<
      CazariLabels,
      "groupedToday" | "groupedThisWeek" | "groupedThisMonth" | "groupedUpcoming"
    >;
    subtitleKey: keyof Pick<
      CazariLabels,
      | "groupedTodayHint"
      | "groupedThisWeekHint"
      | "groupedThisMonthHint"
      | "groupedUpcomingHint"
    >;
  }
> = {
  today: {
    titleKey: "groupedToday",
    subtitleKey: "groupedTodayHint",
  },
  week: {
    titleKey: "groupedThisWeek",
    subtitleKey: "groupedThisWeekHint",
  },
  month: {
    titleKey: "groupedThisMonth",
    subtitleKey: "groupedThisMonthHint",
  },
  upcoming: {
    titleKey: "groupedUpcoming",
    subtitleKey: "groupedUpcomingHint",
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
            title={formatCazariLabel(labels[meta.titleKey], {
              count: bucket.stays.length,
            })}
            subtitle={labels[meta.subtitleKey]}
            items={bucket.stays}
            variant="confirmate"
            returnTo={returnTo}
            hasQuery={hasQuery}
            labels={labels}
            operativeToday={today}
            collapsible
            defaultExpanded={isConfirmedBucketExpandedByDefault(
              bucket.key,
              hasQuery
            )}
          />
        );
      })}
    </div>
  );
}
