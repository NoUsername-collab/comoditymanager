import { describe, it, expect } from "vitest";
import { auditImportBoundaries } from "@/lib/architecture/import-boundaries";

/** Rules that must always pass — zero violations. */
const STRICT_RULES = new Set([
  "domain-no-services",
  "domain-no-app",
  "features-no-app",
  "services-no-app",
  "services-no-components",
  "components-no-app",
]);

describe("import boundary audit", () => {
  it("enforces strict layer rules (domain, features, services, components)", () => {
    const violations = auditImportBoundaries().filter((v) =>
      STRICT_RULES.has(v.rule),
    );

    if (violations.length > 0) {
      const report = violations
        .map((v) => `  ${v.file}:${v.line} [${v.rule}] → ${v.importPath}`)
        .join("\n");
      expect.fail(
        `Strict import violations:\n${report}\nSee ARCHITECTURE.md.`,
      );
    }

    expect(violations).toEqual([]);
  });
});
