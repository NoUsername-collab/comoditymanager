import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import type {
  GuestSearchFilter,
  GuestSearchResult,
} from "@/domain/guest/types";
import { GuestListCard } from "@/features/guests/ui/GuestListCard";
import { GuestCollapsibleSection } from "@/features/guests/ui/GuestCollapsibleSection";
import { GuestRecentHeroSection } from "@/features/guests/ui/GuestRecentHeroSection";
import { GuestPreviewPanel } from "@/features/guests/ui/GuestPreviewPanel";
import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";
import { GuestSearchForm } from "@/features/guests/ui/GuestSearchForm";
import {
  buildGuestListHref,
  guestListPreviewHref,
  guestProfileHref,
  parseGuestListHref,
} from "@/lib/guest-list-links";
import { loadGuestsListPage } from "@/features/guests/loaders";

function PaginationBar({
  pageLabel,
  searchLabel,
  previousLabel,
  nextLabel,
  result,
  currentHref,
}: {
  pageLabel: (page: number) => string;
  searchLabel: (query: string) => string;
  previousLabel: string;
  nextLabel: string;
  result: GuestSearchResult;
  currentHref: string;
}) {
  const current = parseGuestListHref(currentHref);
  return (
    <div className="guest-pagination">
      <p className="guest-pagination__info">
        {pageLabel(result.page)}
        {result.query ? ` · ${searchLabel(result.query)}` : ""}
      </p>
      <div className="guest-pagination__buttons">
        {result.hasPrevious ? (
          <Link
            href={buildGuestListHref({
              q: current.q,
              filter: current.filter,
              page: result.page - 1,
            })}
            className="guest-pagination__btn"
          >
            {previousLabel}
          </Link>
        ) : null}
        {result.hasMore ? (
          <Link
            href={buildGuestListHref({
              q: current.q,
              filter: current.filter,
              page: result.page + 1,
            })}
            className="guest-pagination__btn guest-pagination__btn--next"
          >
            {nextLabel}
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export default async function AdminGuestsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string; page?: string; selected?: string }>;
}) {
  const [t, tCommon, dataBundle] = await Promise.all([
    getTranslations("admin.pages.guests"),
    getTranslations("admin.common"),
    searchParams.then((sp) => loadGuestsListPage(sp)),
  ]);
  const q = dataBundle.q;
  const filter = dataBundle.filter;
  const page = dataBundle.page;
  const currentHref = buildGuestListHref({ q, filter, page });

  const FILTER_LINKS: { id: GuestSearchFilter; label: string }[] = [
    { id: "flagged", label: t("filterFlagged") },
    { id: "blacklist", label: t("filterBlacklist") },
    { id: "watchlist", label: t("filterWatchlist") },
    { id: "recent", label: t("filterRecent") },
    { id: "rated", label: t("filterRated") },
    { id: "returning", label: t("filterReturning") },
  ];

  const result: GuestSearchResult = dataBundle.ok
    ? dataBundle.result
    : {
        items: [],
        query: q,
        filter: (filter as GuestSearchFilter) || "all",
        page,
        pageSize: 20,
        hasMore: false,
        hasPrevious: false,
        mode: "highlights",
      };
  const highlights = dataBundle.ok ? dataBundle.highlights : null;
  const selectedGuest = dataBundle.selectedGuest;
  const error = dataBundle.ok
    ? null
    : dataBundle.error === "generic"
      ? t("genericError")
      : dataBundle.error;

  return (
    <main className="guest-page ml-content">
      <header className="guest-page__header guest-surface">
        <h1 className="guest-page__title">{t("title")}</h1>
        <p className="guest-page__desc">{t("description")}</p>
      </header>

      {error && <p className="guest-page__error">{error}</p>}

      <div className="guest-page__search-area guest-surface">
        <GuestSearchForm
          defaultQuery={q}
          defaultFilter={(result.filter as GuestSearchFilter) || "all"}
        />
        <div className="guest-filter-pills">
          {FILTER_LINKS.map((item) => (
            <Link
              key={item.id}
              href={buildGuestListHref({ filter: item.id })}
              className={[
                "guest-filter-pill",
                result.filter === item.id && "guest-filter-pill--active",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {item.label}
            </Link>
          ))}
        </div>
        <p className="guest-page__hint">{t("searchHint")}</p>
      </div>

      {result.mode === "highlights" && highlights ? (
        <div className="guest-highlights">
          {highlights.recent.length === 0 &&
          highlights.blacklist.length === 0 &&
          highlights.returning.length === 0 &&
          highlights.rated.length === 0 ? (
            <AdminEmptyState
              emoji="👥"
              title={t("highlightsEmptyTitle")}
              description={t("highlightsEmptyDescription")}
              actionHref="/admin/cazari"
              actionLabel={t("highlightsEmptyCta")}
            />
          ) : null}
          <GuestRecentHeroSection
            eyebrow={t("filterRecent")}
            title={t("recentTitle")}
            description={t("recentDescription")}
            guests={highlights.recent}
            currentHref={currentHref}
            guestsCountLabel={t("guestsCount", { count: highlights.recent.length })}
            emptyLabel={t("sectionEmpty")}
          />
          <div className="guest-highlights__secondary">
            <GuestCollapsibleSection
              title={t("blacklistTitle")}
              description={t("blacklistDescription")}
              guests={highlights.blacklist}
              currentHref={currentHref}
              emptyLabel={t("sectionEmpty")}
            />
            <GuestCollapsibleSection
              title={t("returningTitle")}
              description={t("returningDescription")}
              guests={highlights.returning}
              currentHref={currentHref}
              emptyLabel={t("sectionEmpty")}
            />
            <GuestCollapsibleSection
              title={t("ratedTitle")}
              description={t("ratedDescription")}
              guests={highlights.rated}
              currentHref={currentHref}
              emptyLabel={t("sectionEmpty")}
            />
          </div>
        </div>
      ) : (
        <section className="guest-results guest-surface">
          <h2 className="guest-results__title">{t("resultsTitle", { count: result.items.length })}</h2>
          {result.items.length === 0 ? (
            <AdminEmptyState
              emoji="🔎"
              title={t("emptyTitle")}
              description={t("emptyDescription")}
              actionHref={
                q || (result.filter && result.filter !== "all")
                  ? buildGuestListHref({})
                  : undefined
              }
              actionLabel={
                q || (result.filter && result.filter !== "all")
                  ? tCommon("reset")
                  : undefined
              }
            />
          ) : (
            <>
              <ul className="guest-grid">
                {result.items.map((guest) => (
                  <GuestListCard
                    key={guest.id}
                    guest={guest}
                    previewHref={guestListPreviewHref(currentHref, guest.id)}
                    profileHref={guestProfileHref(currentHref, guest.id)}
                  />
                ))}
              </ul>
              <PaginationBar
                pageLabel={(p) => t("pageLabel", { page: p })}
                searchLabel={(query) => t("searchLabel", { query })}
                previousLabel={t("previous")}
                nextLabel={t("next")}
                result={result}
                currentHref={currentHref}
              />
            </>
          )}
        </section>
      )}

      <GuestPreviewPanel
        guest={selectedGuest}
        closeHref={currentHref}
        profileHref={
          selectedGuest
            ? `/admin/guests/${selectedGuest.id}?from=${encodeURIComponent(currentHref)}`
            : "/admin/guests"
        }
      />
    </main>
  );
}
