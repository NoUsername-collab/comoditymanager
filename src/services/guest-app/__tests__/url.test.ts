import { describe, expect, it } from "vitest";
import { buildGuestAppStayUrl } from "../url";

describe("buildGuestAppStayUrl", () => {
  it("builds stay home URL without trailing slash on base", () => {
    expect(buildGuestAppStayUrl("https://pensiune.example", "abc123")).toBe(
      "https://pensiune.example/stay/abc123",
    );
  });

  it("strips trailing slash from base URL", () => {
    expect(buildGuestAppStayUrl("https://pensiune.example/", "xyz")).toBe(
      "https://pensiune.example/stay/xyz",
    );
  });

  it("preserves access code casing from caller", () => {
    expect(buildGuestAppStayUrl("https://host", "AbC12")).toBe(
      "https://host/stay/AbC12",
    );
  });
});
