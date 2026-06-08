import { describe, expect, it } from "vitest";
import {
  resolveLayoutBreakpoint,
  resolveLayoutMode,
  resolveLayoutOrientation,
} from "../resolve";

describe("resolveLayoutMode", () => {
  it("keeps phones mobile in portrait and landscape", () => {
    expect(resolveLayoutMode(390, 844)).toBe("mobile");
    expect(resolveLayoutMode(844, 390)).toBe("mobile");
    expect(resolveLayoutMode(639, 800)).toBe("mobile");
  });

  it("classifies tablet and desktop by width", () => {
    expect(resolveLayoutMode(768, 1024)).toBe("tablet");
    expect(resolveLayoutMode(1024, 768)).toBe("desktop");
    expect(resolveLayoutMode(1280, 800)).toBe("desktop");
  });
});

describe("resolveLayoutOrientation", () => {
  it("detects portrait vs landscape", () => {
    expect(resolveLayoutOrientation(390, 844)).toBe("portrait");
    expect(resolveLayoutOrientation(844, 390)).toBe("landscape");
  });
});

describe("resolveLayoutBreakpoint", () => {
  it("maps width to named breakpoints", () => {
    expect(resolveLayoutBreakpoint(400)).toBe("sm");
    expect(resolveLayoutBreakpoint(800)).toBe("md");
    expect(resolveLayoutBreakpoint(1100)).toBe("lg");
    expect(resolveLayoutBreakpoint(1300)).toBe("xl");
    expect(resolveLayoutBreakpoint(1600)).toBe("2xl");
  });
});
