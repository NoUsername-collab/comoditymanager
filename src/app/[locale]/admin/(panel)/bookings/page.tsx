import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { formatStayPeriod } from "@/lib/ro-calendar";
import { GuestProfileBadges } from "@/features/guests/ui/GuestProfileBadges";
import {
  CERERE_LIST_MAX_SHOWN,
  CERERE_LIST_PAGE_SIZE,
  countCereriNoi,
  listCereriNoiPage,
} from "@/services/bookings/queries";
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
    CERERE_LIST_MAX_SHOWN,
    Math.max(
      CERERE_LIST_PAGE_SIZE,
      Number(params.shown) || CERERE_LIST_PAGE_SIZE
    )
  );

  const [t, total, cereriResult] = await Promise.all([
    getTranslations("admin.pages.bookings"),
    countCereriNoi(),
    listCereriNoiPage(shown)
      .then((data) => ({ ok: true as const, data }))
      .catch((e) => ({ ok: false as const, error: e })),
  ]);

  let cereri: Awaited<ReturnType<typeof listCereriNoiPage>> = [];
  let error: string | null = null;

  if (cereriResult.ok) {
    cereri = cereriResult.data;
  } else {
    error =
      cereriResult.error instanceof Error
        ? cereriResult.error.message
        : t("genericError");
  }

  const hasMore = total > shown && shown < CERERE_LIST_MAX_SHOWN;
  const nextShown = shown + CERERE_LIST_PAGE_SIZE;

  return (
    <AdminPageFrame title={t("title")} description={t("description")}>
      <AdminPanel title={t("windowTitle", { count: total })}>
        {error && <p className="text-sm text-red-800">{error}</p>}

        {total > 0 && cereri.length < total && !error ? (
          <p className="mb-3 text-xs text-zinc-600">
            {t("showingPartial", { shown: cereri.length, total })}
          </p>
        ) : null}

        <ul className="cerere-list">
          {cereri.map((c) => (
            <li key={c.id} className="cerere-item">
              <div className="cerere-item__head">
                <div className="cerere-item__lead">
                  <p className="cerere-item__name">{c.guest_name}</p>
                  <p className="cerere-item__dates">
                    {formatStayPeriod(c.check_in, c.check_out)}
                  </p>
                </div>
                <Link
                  href={`/admin/bookings/${c.id}`}
                  className="cerere-item__action admin-cereri-fill"
                >
                  {t("process")}
                </Link>
              </div>

              <div className="cerere-item__body">
                <p className="cerere-item__guests">
                  {c.num_adults} {t("adultsShort")}
                  {" · "}
                  {c.num_children} {t("childrenShort")}
                </p>
                {c.guest_email ? (
                  <p className="cerere-item__email" title={c.guest_email}>
                    {c.guest_email}
                  </p>
                ) : null}
                {c.guest_id ? (
                  <Link
                    href={`/admin/guests/${c.guest_id}`}
                    className="cerere-item__profile-link"
                  >
                    {t("openClientProfile")} →
                  </Link>
                ) : null}
              </div>

              <GuestProfileBadges
                variant="cerere"
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
              className="cereri-load-more cazari-load-more inline-flex min-h-[var(--ml-touch-min,2.75rem)] items-center rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
            >
              {t("loadMore")}
            </Link>
          </div>
        ) : null}

        {cereri.length === 0 && !error && (
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
