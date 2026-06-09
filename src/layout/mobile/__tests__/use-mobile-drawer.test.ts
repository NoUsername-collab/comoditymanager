import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("useMobileDrawer", () => {
  it("implements focus trap and escape handling", () => {
    const source = readFileSync(
      join(process.cwd(), "src/layout/mobile/use-mobile-drawer.ts"),
      "utf8"
    );
    expect(source).toContain("getFocusableElements");
    expect(source).toContain('e.key === "Escape"');
    expect(source).toContain('e.key !== "Tab"');
    expect(source).toContain("ml-drawer-open");
  });

  it("prefers first focusable in .ml-drawer__nav on open", () => {
    const source = readFileSync(
      join(process.cwd(), "src/layout/mobile/use-mobile-drawer.ts"),
      "utf8"
    );
    expect(source).toContain("getInitialFocusTarget");
    expect(source).toContain(".ml-drawer__nav");
    expect(source).toMatch(/getInitialFocusTarget[\s\S]*\.ml-drawer__nav/);
  });
});
