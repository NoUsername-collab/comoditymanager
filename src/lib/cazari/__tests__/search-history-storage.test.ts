import { describe, expect, it } from "vitest";
import {
  dedupeSearchHistory,
  filterVisibleSearchHistory,
  parseSearchHistory,
  searchHistoryStorageKey,
} from "../search-history-storage";

describe("search-history-storage", () => {
  it("dedupes case-insensitively and keeps most recent first", () => {
    expect(dedupeSearchHistory(["Ion", "Maria"], "ion")).toEqual([
      "ion",
      "Maria",
    ]);
    expect(dedupeSearchHistory(["Ion", "Maria"], "Ana")).toEqual([
      "Ana",
      "Ion",
      "Maria",
    ]);
  });

  it("parses valid JSON arrays only", () => {
    expect(parseSearchHistory('[" petri ", "ion"]')).toEqual(["petri", "ion"]);
    expect(parseSearchHistory("null")).toEqual([]);
    expect(parseSearchHistory("{")).toEqual([]);
  });

  it("scopes storage key by tenant slug or custom domain", () => {
    expect(searchHistoryStorageKey("demo.localhost")).toBe(
      "casaemil-cazari-search-history:demo",
    );
    expect(searchHistoryStorageKey("hotel.example.com")).toBe(
      "casaemil-cazari-search-history:custom:hotel.example.com",
    );
  });

  it("hides exact query matches while filtering", () => {
    const items = ["petri", "petrica", "ion"];
    expect(filterVisibleSearchHistory(items, "")).toEqual(items);
    expect(filterVisibleSearchHistory(items, "petri")).toEqual(["petrica"]);
    expect(filterVisibleSearchHistory(items, "PETRI")).toEqual(["petrica"]);
  });
});
