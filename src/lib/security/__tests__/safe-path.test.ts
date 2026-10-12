import { describe, expect, it } from "vitest";
import { safeInternalPath } from "@/lib/security/safe-path";

describe("safeInternalPath", () => {
  it("keeps same-origin paths", () => {
    expect(safeInternalPath("/admin/cazari?x=1", "/admin")).toBe("/admin/cazari?x=1");
  });

  it("rejects paths that leave the site", () => {
    for (const raw of [
      "//evil.com",
      "/\\evil.com",
      "/\\/evil.com",
      "https://evil.com",
      "@evil.com",
      "evil.com",
      "/admin\\..\\x",
      "/admin\n/x",
      "",
      null,
    ]) {
      expect(safeInternalPath(raw, "/admin")).toBe("/admin");
    }
  });

  it("enforces a prefix when given", () => {
    expect(safeInternalPath("/stay/abc", "/admin/cazari", "/admin")).toBe("/admin/cazari");
    expect(safeInternalPath("/admin/x", "/admin/cazari", "/admin")).toBe("/admin/x");
  });
});
