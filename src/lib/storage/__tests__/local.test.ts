import { describe, expect, it, afterEach, vi } from "vitest";
import { readLocalStorageFirst } from "../local";

function mockStorage() {
  const data = new Map<string, string>();
  const api = {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    clear: () => data.clear(),
  };
  vi.stubGlobal("window", { localStorage: api });
  vi.stubGlobal("localStorage", api);
  return api;
}

describe("readLocalStorageFirst", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("prefers the first populated key", () => {
    const storage = mockStorage();
    storage.setItem("zalmox-theme-id", "alpine");
    storage.setItem("casaemil-theme-id", "noir");
    expect(readLocalStorageFirst(["zalmox-theme-id", "casaemil-theme-id"])).toBe(
      "alpine",
    );
  });

  it("falls back to a legacy key when the new key is missing", () => {
    const storage = mockStorage();
    storage.setItem("casaemil-theme-id", "pearl");
    expect(readLocalStorageFirst(["zalmox-theme-id", "casaemil-theme-id"])).toBe(
      "pearl",
    );
  });
});
