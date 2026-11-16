import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("the public site's section registry", () => {
  it("imports no editor, so guests never download the editing code", () => {
    const source = readFileSync(
      path.resolve(process.cwd(), "src/features/public-site/sections/registry.tsx"),
      "utf8",
    );
    const imports = [...source.matchAll(/from "([^"]+)"/g)].map((m) => m[1]);
    expect(
      imports.filter((p) => /\/Editor$|\/editor\//.test(p) && !p.includes("render-context")),
    ).toEqual([]);
  });
});
