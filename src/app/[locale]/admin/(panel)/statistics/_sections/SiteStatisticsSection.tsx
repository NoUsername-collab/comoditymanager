import { getLocale, getTranslations } from "next-intl/server";
import { AdminPanel } from "@/components/admin/shell/AdminPanel";
import { loadSiteStatisticsPage } from "@/features/settings/loaders";
import { StatCard } from "./StatCard";

/** Visits to the public site beside the booking requests it brought. */
export async function SiteStatisticsSection() {
  const [t, locale, stats] = await Promise.all([
    getTranslations("admin.pages.statistics.site"),
    getLocale(),
    loadSiteStatisticsPage(),
  ]);
  if (!stats) return null;

  const tag = locale === "bg" ? "bg-BG" : locale === "en" ? "en-GB" : "ro-RO";
  const n = (value: number) => new Intl.NumberFormat(tag).format(value);
  const pct = (value: number | null) =>
    value == null ? "—" : new Intl.NumberFormat(tag, { style: "percent", maximumFractionDigits: 1 }).format(value);
  const monthName = (month: string) =>
    new Intl.DateTimeFormat(tag, { month: "long", year: "numeric", timeZone: "UTC" }).format(
      new Date(`${month}-01T00:00:00Z`),
    );
  const { last30 } = stats;
  const noVisits = stats.months.every((m) => m.visits === 0 && m.siteRequests === 0);
  const anyBooking = Object.values(last30.bySource).some((count) => count > 0);

  return (
    <AdminPanel title={t("title")} className="mb-4">
      <p className="site-stats__lead">{t("lead")}</p>

      <div className="site-stats__cards">
        <StatCard label={t("visitors")} value={n(last30.visitors)} />
        <StatCard label={t("visits")} value={n(last30.visits)} />
        <StatCard label={t("requests")} value={n(last30.siteRequests)} />
        <StatCard label={t("conversion")} value={pct(last30.conversion)} />
      </div>
      <p className="site-stats__note">{t("last30")}</p>

      {anyBooking ? (
        <>
          <h3 className="site-stats__heading">{t("bySource")}</h3>
          <ul className="site-stats__sources">
            {(["site", "staff", "phone", "unknown"] as const).map((source) =>
              source === "unknown" && last30.bySource.unknown === 0 ? null : (
                <li key={source}>
                  <span>{t(`sources.${source}`)}</span>
                  <strong>{n(last30.bySource[source])}</strong>
                </li>
              ),
            )}
          </ul>
        </>
      ) : null}

      {noVisits ? (
        <p className="site-stats__empty">{t("empty")}</p>
      ) : (
        <>
          <div className="site-stats__lists">
            <section>
              <h3 className="site-stats__heading">{t("topPages")}</h3>
              <ol className="site-stats__top">
                {stats.topPages.map((row) => (
                  <li key={row.label ?? "-"}>
                    <span>{row.label}</span>
                    <strong>{n(row.visits)}</strong>
                  </li>
                ))}
              </ol>
            </section>
            <section>
              <h3 className="site-stats__heading">{t("topReferrers")}</h3>
              <ol className="site-stats__top">
                {stats.topReferrers.map((row) => (
                  <li key={row.label ?? "direct"}>
                    <span>{row.label ?? t("direct")}</span>
                    <strong>{n(row.visits)}</strong>
                  </li>
                ))}
              </ol>
            </section>
          </div>

          <h3 className="site-stats__heading">{t("byMonth")}</h3>
          <div className="site-stats__table-wrap">
            <table className="site-stats__table">
              <thead>
                <tr>
                  <th scope="col">{t("month")}</th>
                  <th scope="col">{t("visitors")}</th>
                  <th scope="col">{t("requests")}</th>
                  <th scope="col">{t("confirmed")}</th>
                  <th scope="col">{t("conversion")}</th>
                </tr>
              </thead>
              <tbody>
                {stats.months.map((m) => (
                  <tr key={m.month}>
                    <th scope="row">{monthName(m.month)}</th>
                    <td>{n(m.visitors)}</td>
                    <td>{n(m.siteRequests)}</td>
                    <td>{n(m.siteConfirmed)}</td>
                    <td>{pct(m.visitors > 0 ? m.siteRequests / m.visitors : null)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <p className="site-stats__note">{t("privacy")}</p>
    </AdminPanel>
  );
}
