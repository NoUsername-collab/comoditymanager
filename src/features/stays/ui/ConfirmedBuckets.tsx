"use client";

import { groupConfirmedStays, isConfirmedBucketExpandedByDefault } from "@/domain/stays/confirmed-buckets";
import { todayIso } from "@/lib/stay-dates";
import { formatStayLabel } from "@/lib/stay-label-format";
import { StayList } from "@/features/stays/ui/StayList";
import type { StayListLabels, OperationalStay } from "@/features/stays/ui/types";

const BUCKET_META: Record<
  "today" | "week" | "month" | "upcoming",
  {
    titleKey: keyof Pick<
      StayListLabels,
      "groupedToday" | "groupedThisWeek" | "groupedThisMonth" | "groupedUpcoming"
    >;
    subtitleKey: keyof Pick<
      StayListLabels,
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
  labels: StayListLabels;
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
            title={formatStayLabel(labels[meta.titleKey], {
              count: bucket.stays.length,
            })}
            subtitle={labels[meta.subtitleKey]}
            items={bucket.stays}
            variant="confirmed"
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
