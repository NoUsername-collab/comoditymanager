import { describe, it, expect } from "vitest";
import {
  STABLE_VERSION,
  ALPHA_VERSION,
  RELEASE_STAGE,
  releaseLabel,
} from "@/lib/app-version";

// ---------------------------------------------------------------------------
// Version constants
// ---------------------------------------------------------------------------
describe("version constants", () => {
  it("STABLE_VERSION is a semver string", () => {
    expect(STABLE_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("ALPHA_VERSION is a semver-prerelease string", () => {
    expect(ALPHA_VERSION).toMatch(/^\d+\.\d+\.\d+-alpha\.\d+$/);
  });

  it("RELEASE_STAGE is a non-empty string", () => {
    expect(RELEASE_STAGE.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// releaseLabel
// ---------------------------------------------------------------------------
describe("releaseLabel", () => {
  it("returns a label containing the version", () => {
    const label = releaseLabel();
    // Without the alpha env var, we get the stable label
    expect(label).toContain(STABLE_VERSION);
  });

  it("returns a non-empty string", () => {
    expect(releaseLabel().length).toBeGreaterThan(0);
  });
});
