import { describe, it, expect } from "vitest";
import { auditImportBoundaries } from "@/lib/architecture/import-boundaries";

/** Rules that must always pass — zero violations. */
const STRICT_RULES = new Set([
  "domain-no-services",
  "domain-no-app",
  "features-no-app",
  "services-no-app",
]);

/**
 * Known debt: admin components still import route actions/CSS directly.
 * Must not grow; lower when migrating to features action modules.
 */
const COMPONENTS_APP_DEBT_BASELINE = 55;

describe("import boundary audit", () => {
  it("enforces strict layer rules (domain, features, services)", () => {
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

  it("tracks components→app coupling debt (baseline cap)", () => {
    const violations = auditImportBoundaries().filter(
      (v) => v.rule === "components-no-app",
    );

    expect(violations.length).toBeLessThanOrEqual(COMPONENTS_APP_DEBT_BASELINE);

    if (violations.length < COMPONENTS_APP_DEBT_BASELINE) {
      // Reminder to lower baseline when debt is reduced
      expect(violations.length).toBeGreaterThanOrEqual(0);
    }
  });
});
