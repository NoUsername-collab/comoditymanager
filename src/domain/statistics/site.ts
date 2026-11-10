import type { BookingSource } from "@/domain/booking/source";

/*
 * The public site's numbers on the Statistics page: anonymous visits (a visitor
 * counts once a day) beside the booking requests sent from the site.
 */

export type VisitDay = { day: string; visits: number; visitors: number };
export type BookingSourceDay = { day: string; source: BookingSource; requests: number; confirmed: number };

export type SiteMonth = {
  /** "YYYY-MM" */
  month: string;
  visitors: number;
  visits: number;
  siteRequests: number;
  siteConfirmed: number;
};

export type SiteStatistics = {
  last30: {
    visits: number;
    visitors: number;
    siteRequests: number;
    siteConfirmed: number;
    /** Share of visitors who sent a request, 0–1; null without visitors. */
    conversion: number | null;
    /** Every booking made in the period, by where it came from. */
    bySource: Record<BookingSource, number>;
  };
  /** The last 12 months, newest first, months without anything included. */
  months: SiteMonth[];
};

function shiftDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function lastMonths(today: string, count: number): string[] {
  const [y, m] = today.split("-").map(Number) as [number, number];
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1 - i, 1));
    return d.toISOString().slice(0, 7);
  });
}

/** Start of the window the numbers are read from: 12 whole months back. */
export function siteStatisticsSince(today: string): string {
  return `${lastMonths(today, 12).at(-1)}-01`;
}

export function buildSiteStatistics(input: {
  today: string;
  visitDays: VisitDay[];
  bookingDays: BookingSourceDay[];
}): SiteStatistics {
  const from30 = shiftDays(input.today, -29);
  const in30 = (day: string) => day >= from30 && day <= input.today;

  const bySource: Record<BookingSource, number> = { site: 0, staff: 0, phone: 0, unknown: 0 };
  let visits = 0;
  let visitors = 0;
  let siteRequests = 0;
  let siteConfirmed = 0;
  for (const d of input.visitDays) {
    if (!in30(d.day)) continue;
    visits += d.visits;
    visitors += d.visitors;
  }
  for (const d of input.bookingDays) {
    if (!in30(d.day)) continue;
    bySource[d.source] = (bySource[d.source] ?? 0) + d.requests;
    if (d.source === "site") {
      siteRequests += d.requests;
      siteConfirmed += d.confirmed;
    }
  }

  const months = lastMonths(input.today, 12).map((month): SiteMonth => {
    const inMonth = (day: string) => day.startsWith(month);
    const v = input.visitDays.filter((d) => inMonth(d.day));
    const b = input.bookingDays.filter((d) => inMonth(d.day) && d.source === "site");
    return {
      month,
      visits: v.reduce((sum, d) => sum + d.visits, 0),
      visitors: v.reduce((sum, d) => sum + d.visitors, 0),
      siteRequests: b.reduce((sum, d) => sum + d.requests, 0),
      siteConfirmed: b.reduce((sum, d) => sum + d.confirmed, 0),
    };
  });

  return {
    last30: {
      visits,
      visitors,
      siteRequests,
      siteConfirmed,
      conversion: visitors > 0 ? siteRequests / visitors : null,
      bySource,
    },
    months,
  };
}
