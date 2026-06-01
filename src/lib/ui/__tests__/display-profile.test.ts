import { describe, expect, it } from "vitest";
import {
  isCompactDisplayProfile,
  resolveDisplayProfile,
  resolveViewportHeightTier,
} from "@/lib/ui/display-profile";

describe("resolveDisplayProfile", () => {
  it("classifies 15.6\" 1920×1080 as wide", () => {
    expect(resolveDisplayProfile(1920, 1080)).toBe("wide");
  });

  it("classifies 14\" 1366×768 as compact-laptop", () => {
    expect(resolveDisplayProfile(1366, 768)).toBe("compact-laptop");
  });

  it("classifies 1440px width as laptop", () => {
    expect(resolveDisplayProfile(1440, 900)).toBe("laptop");
  });

  it("classifies narrow tablet width as narrow", () => {
    expect(resolveDisplayProfile(800, 600)).toBe("narrow");
  });
});

describe("isCompactDisplayProfile", () => {
  it("is compact only for compact-laptop and narrow", () => {
    expect(isCompactDisplayProfile("compact-laptop")).toBe(true);
    expect(isCompactDisplayProfile("narrow")).toBe(true);
    expect(isCompactDisplayProfile("wide")).toBe(false);
    expect(isCompactDisplayProfile("laptop")).toBe(false);
  });
});

describe("resolveViewportHeightTier", () => {
  it("marks 650px height as short", () => {
    expect(resolveViewportHeightTier(650)).toBe("short");
  });

  it("marks 768px height as standard", () => {
    expect(resolveViewportHeightTier(768)).toBe("standard");
  });

  it("marks 900px height as tall", () => {
    expect(resolveViewportHeightTier(900)).toBe("tall");
  });
});
