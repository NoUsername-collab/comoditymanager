import { describe, it, expect } from "vitest";
import {
  auditCssArchitecture,
  auditCssGodFileSizes,
} from "@/lib/architecture/css-boundaries";

describe("CSS architecture audit", () => {
  it("keeps feature CSS out of src/app/ (globals shim only)", () => {
    const violations = auditCssArchitecture().filter((v) => v.rule === "no-app-css");

    if (violations.length > 0) {
      const report = violations
        .map((v) => `  ${v.file} [${v.rule}] ${v.detail}`)
        .join("\n");
      expect.fail(`CSS in wrong layer:\n${report}\nSee ARCHITECTURE.md § CSS.`);
    }

    expect(violations).toEqual([]);
  });

  it("keeps globals.css as a thin entry shim", () => {
    const violations = auditCssArchitecture().filter(
      (v) =>
        v.rule === "globals-shim-only" ||
        v.rule === "no-global-gantt" ||
        v.rule === "no-global-route-css" ||
        v.rule === "gantt-premium-calendar-only" ||
        v.rule === "checkin-css-single-entry",
    );
    expect(violations).toEqual([]);
  });

  it("organizes styles under src/styles/ (themes + features + entry)", () => {
    const violations = auditCssArchitecture();
    expect(violations.length).toBe(0);
  });

  it("freezes god CSS files at current line caps", () => {
    const sizes = auditCssGodFileSizes();

    for (const { file, lines, maxLines } of sizes) {
      if (lines !== maxLines) {
        const hint =
          lines < maxLines
            ? `Size dropped — set maxLines to ${lines} in CSS_GOD_FILE_LINE_CAPS.`
            : `God file grew — put new rules in a route-scoped sheet or Tailwind, then split later.`;
        expect.fail(`${file}: ${lines} lines (cap ${maxLines}). ${hint}`);
      }
    }

    expect(sizes.every((s) => s.lines === s.maxLines)).toBe(true);
  });
});
