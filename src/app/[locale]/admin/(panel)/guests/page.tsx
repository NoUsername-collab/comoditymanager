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
import { AdminRetroPageFrame } from "@/components/admin/retro/AdminRetroPageFrame";
import { RetroXpWindow } from "@/components/admin/retro/RetroXpWindow";
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

function GuestListSection({
  sectionLabel,
  guestsLabel,
  emptyLabel,
  title,
  description,
  guests,
  currentHref,
}: {
  sectionLabel: string;
  guestsLabel: (count: number) => string;
  emptyLabel: string;
  title: string;
  description: string;
  guests: GuestListItem[];
  currentHref: string;
}) {
  return (
    <RetroXpWindow title={`${title} (${guests.length})`} className="mb-6">
      <div
        className="mb-3 rounded-md border px-3 py-2"
        style={{
          borderColor: "var(--border)",
          background: "var(--surface-2)",
        }}
      >
        <p
          className="text-[10px] font-bold uppercase tracking-[0.18em]"
          style={{ color: "var(--text-faint)" }}
        >
          {sectionLabel}
        </p>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-black" style={{ color: "var(--text)" }}>
            {title}
          </h2>
          <span
            className="rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em]"
            style={{
              borderColor: "var(--accent)",
              background: "var(--accent-muted)",
              color: "var(--accent)",
            }}
          >
            {guestsLabel(guests.length)}
          </span>
        </div>
        <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
          {description}
        </p>
      </div>

      {guests.length === 0 ? (
        <p className="text-sm text-zinc-500">{emptyLabel}</p>
      ) : (
        <ul className="grid justify-start gap-3 [grid-template-columns:repeat(auto-fit,minmax(220px,240px))]">
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
    </RetroXpWindow>
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
    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-200 pt-4 text-sm">
      <p className="text-zinc-500">
        {pageLabel(result.page)}
        {result.query ? ` · ${searchLabel(result.query)}` : ""}
      </p>
      <div className="flex gap-2">
        {result.hasPrevious ? (
          <Link
            href={buildGuestListHref({
              q: current.q,
              filter: current.filter,
              page: result.page - 1,
            })}
            className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
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
            className="admin-cereri-fill px-4 py-2 text-sm font-medium"
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
    <AdminRetroPageFrame title={t("title")} description={t("description")}>
      {error && <p className="mb-4 text-sm text-red-800">{error}</p>}

      <RetroXpWindow title={t("searchTitle")} className="mb-6">
        <div className="space-y-3">
          <GuestSearchForm
            defaultQuery={q}
            defaultFilter={(result.filter as GuestSearchFilter) || "all"}
          />
          <div className="flex flex-wrap gap-2">
            {FILTER_LINKS.map((item) => (
              <Link
                key={item.id}
                href={buildGuestListHref({ filter: item.id })}
                className="rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
              >
                {item.label}
              </Link>
            ))}
          </div>
          <p className="text-xs text-zinc-500">{t("searchHint")}</p>
        </div>
      </RetroXpWindow>

      {result.mode === "highlights" && highlights ? (
        <>
          <GuestListSection
            sectionLabel={t("sectionLabel")}
            guestsLabel={(count) => t("guestsCount", { count })}
            emptyLabel={t("sectionEmpty")}
            title={t("blacklistTitle")}
            description={t("blacklistDescription")}
            guests={highlights.blacklist}
            currentHref={currentHref}
          />
          <GuestListSection
            sectionLabel={t("sectionLabel")}
            guestsLabel={(count) => t("guestsCount", { count })}
            emptyLabel={t("sectionEmpty")}
            title={t("loyalTitle")}
            description={t("loyalDescription")}
            guests={highlights.loyal}
            currentHref={currentHref}
          />
          <GuestListSection
            sectionLabel={t("sectionLabel")}
            guestsLabel={(count) => t("guestsCount", { count })}
            emptyLabel={t("sectionEmpty")}
            title={t("ratedTitle")}
            description={t("ratedDescription")}
            guests={highlights.rated}
            currentHref={currentHref}
          />
          <GuestListSection
            sectionLabel={t("sectionLabel")}
            guestsLabel={(count) => t("guestsCount", { count })}
            emptyLabel={t("sectionEmpty")}
            title={t("recentTitle")}
            description={t("recentDescription")}
            guests={highlights.recent}
            currentHref={currentHref}
          />
        </>
      ) : (
        <RetroXpWindow title={t("resultsTitle", { count: result.items.length })}>
          {result.items.length === 0 ? (
            <AdminEmptyState
              emoji="??"
              title={t("emptyTitle")}
              description={t("emptyDescription")}
            />
          ) : (
            <>
              <ul className="grid justify-start gap-3 [grid-template-columns:repeat(auto-fit,minmax(220px,240px))]">
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
        </RetroXpWindow>
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
    </AdminRetroPageFrame>
  );
}

