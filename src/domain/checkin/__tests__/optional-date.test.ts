import { describe, test, expect } from "vitest";
import { optionalDateForDb } from "../types";

describe("optionalDateForDb", () => {
  test("returns null for empty or whitespace", () => {
    expect(optionalDateForDb("")).toBeNull();
    expect(optionalDateForDb("   ")).toBeNull();
    expect(optionalDateForDb(null)).toBeNull();
    expect(optionalDateForDb(undefined)).toBeNull();
  });

  test("returns trimmed date when provided", () => {
    expect(optionalDateForDb("1985-01-01")).toBe("1985-01-01");
    expect(optionalDateForDb(" 1990-12-31 ")).toBe("1990-12-31");
  });
});
