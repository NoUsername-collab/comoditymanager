import { tenantDomainFromHost, tenantSlugFromHost } from "@/lib/tenant/host";
import { readLocalStorageFirst } from "@/lib/storage/local";

export const STAY_SEARCH_HISTORY_MAX = 10;
const STORAGE_PREFIX = "zalmox-stays-search-history";
const LEGACY_STORAGE_PREFIXES = [
  "zalmox-cazari-search-history",
  "casaemil-cazari-search-history",
];

export function normalizeSearchHistoryTerm(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

export function dedupeSearchHistory(terms: string[], next: string): string[] {
  const normalized = normalizeSearchHistoryTerm(next);
  if (!normalized) return terms;
  const lower = normalized.toLowerCase();
  const filtered = terms.filter((term) => term.toLowerCase() !== lower);
  return [normalized, ...filtered].slice(0, STAY_SEARCH_HISTORY_MAX);
}

export function searchHistoryStorageKey(
  hostInput: string,
  prefix = STORAGE_PREFIX,
): string {
  const slug = tenantSlugFromHost(hostInput);
  if (slug) return `${prefix}:${slug}`;
  const domain = tenantDomainFromHost(hostInput);
  if (domain) return `${prefix}:custom:${domain}`;
  return prefix;
}

export function parseSearchHistory(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is string => typeof item === "string")
      .map(normalizeSearchHistoryTerm)
      .filter(Boolean)
      .slice(0, STAY_SEARCH_HISTORY_MAX);
  } catch {
    return [];
  }
}

export function readStaySearchHistory(hostInput?: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const host = hostInput ?? window.location.host;
    const keys = [
      searchHistoryStorageKey(host),
      ...LEGACY_STORAGE_PREFIXES.map((prefix) =>
        searchHistoryStorageKey(host, prefix),
      ),
    ];
    return parseSearchHistory(readLocalStorageFirst(keys));
  } catch {
    return [];
  }
}

export function writeStaySearchHistory(
  terms: string[],
  hostInput?: string,
): void {
  if (typeof window === "undefined") return;
  try {
    const host = hostInput ?? window.location.host;
    const key = searchHistoryStorageKey(host);
    if (terms.length === 0) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(
        key,
        JSON.stringify(terms.slice(0, STAY_SEARCH_HISTORY_MAX)),
      );
    }
  } catch {
    // localStorage may be unavailable
  }
}

export function addStaySearchHistoryTerm(
  term: string,
  hostInput?: string,
): string[] {
  const current = readStaySearchHistory(hostInput);
  const next = dedupeSearchHistory(current, term);
  writeStaySearchHistory(next, hostInput);
  return next;
}

export function removeStaySearchHistoryTerm(
  term: string,
  hostInput?: string,
): string[] {
  const normalized = normalizeSearchHistoryTerm(term).toLowerCase();
  const current = readStaySearchHistory(hostInput);
  const next = current.filter((item) => item.toLowerCase() !== normalized);
  writeStaySearchHistory(next, hostInput);
  return next;
}

export function clearStaySearchHistory(hostInput?: string): void {
  writeStaySearchHistory([], hostInput);
}

export function filterVisibleSearchHistory(
  items: string[],
  query: string,
): string[] {
  const normalizedQuery = normalizeSearchHistoryTerm(query).toLowerCase();
  if (!normalizedQuery) return items;
  return items.filter((item) => {
    const normalizedItem = item.toLowerCase();
    if (normalizedItem === normalizedQuery) return false;
    return normalizedItem.includes(normalizedQuery);
  });
}
