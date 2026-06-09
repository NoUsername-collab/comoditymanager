import { describe, expect, it } from "vitest";
import { matchesStaySearchQuery } from "../stay-search";

describe("matchesStaySearchQuery", () => {
  const stay = {
    id: "bk-abc123",
    guest_name: "Ion Popescu",
    guest_first_name: "Ion",
    guest_last_name: "Popescu",
    guest_email: "ion@example.com",
    guest_phone: "0712345678",
    room_names: ["Camera 1"],
  };

  it("matches guest name tokens", () => {
    expect(matchesStaySearchQuery(stay, "popescu")).toBe(true);
    expect(matchesStaySearchQuery(stay, "ion camera")).toBe(true);
  });

  it("returns true for empty query", () => {
    expect(matchesStaySearchQuery(stay, "")).toBe(true);
    expect(matchesStaySearchQuery(stay, "   ")).toBe(true);
  });

  it("rejects when a token is missing", () => {
    expect(matchesStaySearchQuery(stay, "maria")).toBe(false);
  });
});
