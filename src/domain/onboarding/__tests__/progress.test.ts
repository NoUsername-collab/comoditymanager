import { describe, it, expect } from "vitest";
import { computeOnboardingProgress } from "../progress";
import { ONBOARDING_STEPS, REQUIRED_STEP_COUNT } from "../steps";
import type { OnboardingSnapshot } from "../steps";

const EMPTY_SNAPSHOT: OnboardingSnapshot = {
  hasPensionName: false,
  buildingCount: 0,
  roomCount: 0,
  teamMemberCount: 0,
  hasPublicPage: false,
};

const COMPLETE_SNAPSHOT: OnboardingSnapshot = {
  hasPensionName: true,
  buildingCount: 1,
  roomCount: 3,
  teamMemberCount: 1,
  hasPublicPage: true,
};

describe("Onboarding Progress", () => {
  it("returns 0% for empty snapshot", () => {
    const p = computeOnboardingProgress(EMPTY_SNAPSHOT);
    expect(p.percentage).toBe(0);
    expect(p.completedCount).toBe(0);
    expect(p.isComplete).toBe(false);
  });

  it("is complete when name and rooms exist", () => {
    const p = computeOnboardingProgress({
      ...EMPTY_SNAPSHOT,
      hasPensionName: true,
      buildingCount: 1,
      roomCount: 2,
    });
    expect(p.percentage).toBe(100);
    expect(p.isComplete).toBe(true);
  });

  it("returns 100% when all required steps complete", () => {
    const p = computeOnboardingProgress(COMPLETE_SNAPSHOT);
    expect(p.percentage).toBe(100);
    expect(p.isComplete).toBe(true);
  });

  it("next step points to inventory after the property name", () => {
    const snapshot: OnboardingSnapshot = {
      ...EMPTY_SNAPSHOT,
      hasPensionName: true,
    };
    const p = computeOnboardingProgress(snapshot);
    expect(p.nextStep?.id).toBe("inventory");
  });

  it("counts optional steps in total but not in percentage", () => {
    const snapshot: OnboardingSnapshot = {
      ...COMPLETE_SNAPSHOT,
      teamMemberCount: 0,
      hasPublicPage: false,
    };
    const p = computeOnboardingProgress(snapshot);
    expect(p.percentage).toBe(100);
    expect(p.isComplete).toBe(true);
    expect(p.completedCount).toBe(ONBOARDING_STEPS.length - 2);
  });

  it("has two required steps", () => {
    expect(REQUIRED_STEP_COUNT).toBe(2);
    expect(ONBOARDING_STEPS).toHaveLength(4);
  });

  it("partial progress computes correct percentage", () => {
    const snapshot: OnboardingSnapshot = {
      ...EMPTY_SNAPSHOT,
      hasPensionName: true,
    };
    const p = computeOnboardingProgress(snapshot);
    expect(p.percentage).toBe(50);
    expect(p.completedCount).toBe(1);
    expect(p.isComplete).toBe(false);
  });
});
