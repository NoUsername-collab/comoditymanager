import { getTenantScope } from "@/lib/tenant/scope";
import { BOOKING_SOURCES, type BookingSource } from "@/domain/booking/source";
import {
  buildSiteStatistics,
  siteStatisticsSince,
  type SiteStatistics,
} from "@/domain/statistics/site";

export type SiteTopRow = { label: string | null; visits: number };

export type SiteStatisticsPage = SiteStatistics & {
  topPages: SiteTopRow[];
  topReferrers: SiteTopRow[];
};

function asSource(raw: unknown): BookingSource {
  return BOOKING_SOURCES.includes(raw as BookingSource) ? (raw as BookingSource) : "unknown";
}

/** The public site's visits and requests, read through the database's day totals. */
export async function loadSiteStatistics(today: string): Promise<SiteStatisticsPage> {
  const { tenantId, supabase } = await getTenantScope();
  const since = siteStatisticsSince(today);
  const d30 = new Date(`${today}T00:00:00Z`);
  d30.setUTCDate(d30.getUTCDate() - 29);
  const since30 = d30.toISOString().slice(0, 10);

  const [visits, bookings, pages, referrers] = await Promise.all([
    supabase.rpc("public_site_visit_days", { p_tenant_id: tenantId, p_since: since }),
    supabase.rpc("booking_source_days", { p_tenant_id: tenantId, p_since: since }),
    supabase.rpc("public_site_visit_top", { p_tenant_id: tenantId, p_since: since30, p_kind: "path" }),
    supabase.rpc("public_site_visit_top", { p_tenant_id: tenantId, p_since: since30, p_kind: "referrer" }),
  ]);
  for (const result of [visits, bookings, pages, referrers]) {
    if (result.error) throw new Error(result.error.message);
  }

  const stats = buildSiteStatistics({
    today,
    visitDays: ((visits.data ?? []) as { day: string; visits: number; visitors: number }[]).map((r) => ({
      day: r.day,
      visits: Number(r.visits),
      visitors: Number(r.visitors),
    })),
    bookingDays: ((bookings.data ?? []) as { day: string; source: string; requests: number; confirmed: number }[]).map(
      (r) => ({
        day: r.day,
        source: asSource(r.source),
        requests: Number(r.requests),
        confirmed: Number(r.confirmed),
      }),
    ),
  });
  const top = (rows: unknown) =>
    ((rows ?? []) as { label: string | null; visits: number }[]).map((r) => ({
      label: r.label,
      visits: Number(r.visits),
    }));

  return { ...stats, topPages: top(pages.data), topReferrers: top(referrers.data) };
}
