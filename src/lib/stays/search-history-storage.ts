import { tenantDomainFromHost, tenantSlugFromHost } from "@/lib/tenant/host";

export const CAZARI_SEARCH_HISTORY_MAX = 10;
const STORAGE_PREFIX = "casaemil-cazari-search-history";

export function normalizeSearchHistoryTerm(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

export function dedupeSearchHistory(terms: string[], next: string): string[] {
  const normalized = normalizeSearchHistoryTerm(next);
  if (!normalized) return terms;
  const lower = normalized.toLowerCase();
  const filtered = terms.filter((term) => term.toLowerCase() !== lower);
  return [normalized, ...filtered].slice(0, CAZARI_SEARCH_HISTORY_MAX);
}

export function searchHistoryStorageKey(hostInput: string): string {
  const slug = tenantSlugFromHost(hostInput);
  if (slug) return `${STORAGE_PREFIX}:${slug}`;
  const domain = tenantDomainFromHost(hostInput);
  if (domain) return `${STORAGE_PREFIX}:custom:${domain}`;
  return STORAGE_PREFIX;
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
      .slice(0, CAZARI_SEARCH_HISTORY_MAX);
  } catch {
    return [];
  }
}

export function readCazariSearchHistory(hostInput?: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const host = hostInput ?? window.location.host;
    const key = searchHistoryStorageKey(host);
    return parseSearchHistory(localStorage.getItem(key));
  } catch {
    return [];
  }
}

export function writeCazariSearchHistory(
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
        JSON.stringify(terms.slice(0, CAZARI_SEARCH_HISTORY_MAX)),
      );
    }
  } catch {
    // localStorage may be unavailable
  }
}

export function addCazariSearchHistoryTerm(
  term: string,
  hostInput?: string,
): string[] {
  const current = readCazariSearchHistory(hostInput);
  const next = dedupeSearchHistory(current, term);
  writeCazariSearchHistory(next, hostInput);
  return next;
}

export function removeCazariSearchHistoryTerm(
  term: string,
  hostInput?: string,
): string[] {
  const normalized = normalizeSearchHistoryTerm(term).toLowerCase();
  const current = readCazariSearchHistory(hostInput);
  const next = current.filter((item) => item.toLowerCase() !== normalized);
  writeCazariSearchHistory(next, hostInput);
  return next;
}

export function clearCazariSearchHistory(hostInput?: string): void {
  writeCazariSearchHistory([], hostInput);
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
