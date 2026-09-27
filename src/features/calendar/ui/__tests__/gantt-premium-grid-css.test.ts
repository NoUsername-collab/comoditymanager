import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const GRID_CSS = path.resolve(
  process.cwd(),
  "src/styles/features/admin/gantt-premium-grid.css"
);

describe("gantt premium grid CSS", () => {
  const css = fs.readFileSync(GRID_CSS, "utf8");

  it("places check-in/out ticks with left percentages, not box-shadow", () => {
    expect(css).toMatch(/left:\s*var\(--gantt-check-out-pct/);
    expect(css).toMatch(/left:\s*var\(--gantt-check-in-pct/);
    expect(css).not.toMatch(/box-shadow:[^;{]*--gantt-check-out-pct/);
    expect(css).not.toMatch(/box-shadow:[^;{]*--gantt-check-in-pct/);
  });

  it("mixes weekend paper from text ink, not pale border-strong", () => {
    expect(css).toMatch(/--gantt-weekend-ink:\s*var\(--text-muted/);
    expect(css).toMatch(/--gantt-weekend-paper:/);
    expect(css).toMatch(/88%/);
    expect(css).not.toMatch(/--gantt-weekend-paper:[^;]*--border-strong/);
  });

  it("lets coverage-30 day cells fill the column so hour ticks are not pinned left", () => {
    expect(css).toMatch(/max-width:\s*none/);
  });

  it("draws hour ticks as dashed bars, not solid column walls", () => {
    expect(css).toMatch(/repeating-linear-gradient\(\s*to bottom/);
  });

  it("stretches the header 11/14 bar across the full day", () => {
    expect(css).toMatch(/align-self:\s*stretch/);
    expect(css).toMatch(/grid-template-columns:\s*[\s\S]*--gantt-check-out-pct/);
  });
});
