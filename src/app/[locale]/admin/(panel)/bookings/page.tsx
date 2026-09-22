import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { formatStayPeriod } from "@/lib/ro-calendar";
import { GuestProfileBadges } from "@/features/guests/ui/GuestProfileBadges";
import {
  REQUEST_LIST_MAX_SHOWN,
  REQUEST_LIST_PAGE_SIZE,
  loadRequestsListPage,
} from "@/features/bookings/loaders";
import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";
import { AdminPageFrame } from "@/components/admin/shell/AdminPageFrame";
import { AdminPanel } from "@/components/admin/shell/AdminPanel";

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ shown?: string }>;
}) {
  const params = await searchParams;
  const shown = Math.min(
    REQUEST_LIST_MAX_SHOWN,
    Math.max(
      REQUEST_LIST_PAGE_SIZE,
      Number(params.shown) || REQUEST_LIST_PAGE_SIZE
    )
  );

  const [t, { total, requestsResult }] = await Promise.all([
    getTranslations("admin.pages.bookings"),
    loadRequestsListPage(shown),
  ]);

  const requests = requestsResult.ok ? requestsResult.data : [];
  const error = requestsResult.ok
    ? null
    : requestsResult.error instanceof Error
      ? requestsResult.error.message
      : t("genericError");

  const hasMore = total > shown && shown < REQUEST_LIST_MAX_SHOWN;
  const nextShown = shown + REQUEST_LIST_PAGE_SIZE;

  return (
    <AdminPageFrame title={t("title")} description={t("description")}>
      <AdminPanel title={t("windowTitle", { count: total })}>
        {error && <p className="text-sm text-red-800">{error}</p>}

        {total > 0 && requests.length < total && !error ? (
          <p className="mb-3 text-xs text-zinc-600">
            {t("showingPartial", { shown: requests.length, total })}
          </p>
        ) : null}

        <ul className="request-list">
          {requests.map((c) => (
            <li key={c.id} className="request-item">
              <div className="request-item__head">
                <div className="request-item__lead">
                  <p className="request-item__name">{c.guest_name}</p>
                  <p className="request-item__dates">
                    {formatStayPeriod(c.check_in, c.check_out)}
                  </p>
                </div>
                <Link
                  href={`/admin/bookings/${c.id}`}
                  className="request-item__action admin-requests-fill"
                >
                  {t("process")}
                </Link>
              </div>

              <div className="request-item__body">
                <p className="request-item__guests">
                  {c.num_adults} {t("adultsShort")}
                  {" · "}
                  {c.num_children} {t("childrenShort")}
                </p>
                {c.guest_email ? (
                  <p className="request-item__email" title={c.guest_email}>
                    {c.guest_email}
                  </p>
                ) : null}
                {c.guest_id ? (
                  <Link
                    href={`/admin/guests/${c.guest_id}`}
                    className="request-item__profile-link"
                  >
                    {t("openClientProfile")} →
                  </Link>
                ) : null}
              </div>

              <GuestProfileBadges
                variant="request"
                profile={c.guest_profile}
                alertLevel={c.guest_alert_level}
                alertNote={c.guest_alert_note}
              />
            </li>
          ))}
        </ul>

        {hasMore && !error ? (
          <div className="mt-4">
            <Link
              href={`/admin/bookings?shown=${nextShown}`}
              className="requests-load-more stays-load-more inline-flex min-h-[var(--ml-touch-min,2.75rem)] items-center rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
            >
              {t("loadMore")}
            </Link>
          </div>
        ) : null}

        {requests.length === 0 && !error && (
          <AdminEmptyState
            emoji="?"
            title={t("emptyTitle")}
            description={t("emptyDescription")}
            actionHref="/calendar"
            actionLabel={t("emptyAction")}
          />
        )}
      </AdminPanel>
    </AdminPageFrame>
  );
}
