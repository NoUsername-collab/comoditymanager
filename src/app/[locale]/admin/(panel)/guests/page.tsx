import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import type {
  GuestListItem,
  GuestSearchFilter,
  GuestSearchResult,
} from "@/domain/guest/types";
import { GuestListCard } from "@/components/admin/guests/GuestListCard";
import { GuestPreviewPanel } from "@/components/admin/guests/GuestPreviewPanel";
import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";
import { GuestSearchForm } from "@/components/admin/guests/GuestSearchForm";
import { getGuestById, listGuestHighlights, searchGuests } from "@/services/guests";

function firstValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function normalizePage(value: string): number {
  const page = Number(value);
  return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
}

function buildGuestListHref(input: {
  q?: string;
  filter?: string;
  page?: number;
  selected?: string | null;
}): string {
  const params = new URLSearchParams();
  const q = input.q?.trim();
  const filter = input.filter?.trim();

  if (q) params.set("q", q);
  if (filter && filter !== "all") params.set("filter", filter);
  if (input.page && input.page > 1) params.set("page", String(input.page));
  if (input.selected) params.set("selected", input.selected);

  const query = params.toString();
  return query ? `/admin/guests?${query}` : "/admin/guests";
}

function parseHref(href: string): { q?: string; filter?: string; page?: number } {
  const url = new URL(href, "https://cursor.local");
  return {
    q: url.searchParams.get("q") ?? undefined,
    filter: url.searchParams.get("filter") ?? undefined,
    page: normalizePage(url.searchParams.get("page") ?? ""),
  };
}

function GuestSection({
  title,
  description,
  guests,
  currentHref,
  guestsLabel,
  emptyLabel,
}: {
  title: string;
  description: string;
  guests: GuestListItem[];
  currentHref: string;
  guestsLabel: (count: number) => string;
  emptyLabel: string;
}) {
  return (
    <section className="guest-section guest-surface">
      <div className="guest-section__header">
        <div>
          <h2 className="guest-section__title">{title}</h2>
          <p className="guest-section__desc">{description}</p>
        </div>
        <span className="guest-section__count" aria-live="polite">
          {guestsLabel(guests.length)}
        </span>
      </div>
      {guests.length === 0 ? (
        <p className="guest-section__empty">{emptyLabel}</p>
      ) : (
        <ul className="guest-grid">
          {guests.map((guest) => (
            <GuestListCard
              key={guest.id}
              guest={guest}
              previewHref={buildGuestListHref({ ...parseHref(currentHref), selected: guest.id })}
              profileHref={`/admin/guests/${guest.id}?from=${encodeURIComponent(currentHref)}`}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

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
  const current = parseHref(currentHref);
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
  const t = await getTranslations("admin.pages.guests");
  const raw = await searchParams;
  const q = firstValue(raw.q);
  const filter = firstValue(raw.filter);
  const page = normalizePage(firstValue(raw.page));
  const selected = firstValue(raw.selected);
  const currentHref = buildGuestListHref({ q, filter, page });

  const FILTER_LINKS: { id: GuestSearchFilter; label: string }[] = [
    { id: "flagged", label: t("filterFlagged") },
    { id: "blacklist", label: t("filterBlacklist") },
    { id: "watchlist", label: t("filterWatchlist") },
    { id: "recent", label: t("filterRecent") },
    { id: "rated", label: t("filterRated") },
    { id: "loyal", label: t("filterLoyal") },
  ];

  let result: GuestSearchResult = {
    items: [],
    query: q,
    filter: (filter as GuestSearchFilter) || "all",
    page,
    pageSize: 20,
    hasMore: false,
    hasPrevious: false,
    mode: "highlights",
  };
  let highlights: Awaited<ReturnType<typeof listGuestHighlights>> | null = null;
  let selectedGuest: Awaited<ReturnType<typeof getGuestById>> = null;
  let error: string | null = null;

  try {
    result = await searchGuests({ query: q, filter, page, pageSize: 20 });
    if (result.mode === "highlights") {
      highlights = await listGuestHighlights();
    }
  } catch (e) {
    error = e instanceof Error ? e.message : t("genericError");
  }

  if (selected) {
    try {
      selectedGuest = await getGuestById(selected);
    } catch {
      selectedGuest = null;
    }
  }

  return (
    <main className="guest-page">
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
          <GuestSection
            title={t("blacklistTitle")}
            description={t("blacklistDescription")}
            guests={highlights.blacklist}
            currentHref={currentHref}
            guestsLabel={(count) => t("guestsCount", { count })}
            emptyLabel={t("sectionEmpty")}
          />
          <GuestSection
            title={t("loyalTitle")}
            description={t("loyalDescription")}
            guests={highlights.loyal}
            currentHref={currentHref}
            guestsLabel={(count) => t("guestsCount", { count })}
            emptyLabel={t("sectionEmpty")}
          />
          <GuestSection
            title={t("ratedTitle")}
            description={t("ratedDescription")}
            guests={highlights.rated}
            currentHref={currentHref}
            guestsLabel={(count) => t("guestsCount", { count })}
            emptyLabel={t("sectionEmpty")}
          />
          <GuestSection
            title={t("recentTitle")}
            description={t("recentDescription")}
            guests={highlights.recent}
            currentHref={currentHref}
            guestsLabel={(count) => t("guestsCount", { count })}
            emptyLabel={t("sectionEmpty")}
          />
        </div>
      ) : (
        <section className="guest-results guest-surface">
          <h2 className="guest-results__title">{t("resultsTitle", { count: result.items.length })}</h2>
          {result.items.length === 0 ? (
            <AdminEmptyState
              emoji="🔎"
              title={t("emptyTitle")}
              description={t("emptyDescription")}
            />
          ) : (
            <>
              <ul className="guest-grid">
                {result.items.map((guest) => (
                  <GuestListCard
                    key={guest.id}
                    guest={guest}
                    previewHref={buildGuestListHref({ q, filter, page, selected: guest.id })}
                    profileHref={`/admin/guests/${guest.id}?from=${encodeURIComponent(currentHref)}`}
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
