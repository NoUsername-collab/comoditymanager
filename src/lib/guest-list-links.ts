function normalizePage(value: string): number {
  const page = Number(value);
  return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
}

export function buildGuestListHref(input: {
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

export function parseGuestListHref(href: string): {
  q?: string;
  filter?: string;
  page?: number;
} {
  const url = new URL(href, "https://cursor.local");
  return {
    q: url.searchParams.get("q") ?? undefined,
    filter: url.searchParams.get("filter") ?? undefined,
    page: normalizePage(url.searchParams.get("page") ?? ""),
  };
}

export function guestListPreviewHref(currentHref: string, guestId: string): string {
  return buildGuestListHref({
    ...parseGuestListHref(currentHref),
    selected: guestId,
  });
}

export function guestProfileHref(currentHref: string, guestId: string): string {
  return `/admin/guests/${guestId}?from=${encodeURIComponent(currentHref)}`;
}
