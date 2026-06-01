import { describe, it, expect } from "vitest";
import { computeOnboardingProgress } from "../progress";
import { ONBOARDING_STEPS, REQUIRED_STEP_COUNT } from "../steps";
import type { OnboardingSnapshot } from "../steps";

const EMPTY_SNAPSHOT: OnboardingSnapshot = {
  hasPensionName: false,
  buildingCount: 0,
  roomCount: 0,
  hasBooking: false,
  hasConfirmedBooking: false,
  teamMemberCount: 0,
  hasPublicPage: false,
};

const COMPLETE_SNAPSHOT: OnboardingSnapshot = {
  hasPensionName: true,
  buildingCount: 2,
  roomCount: 5,
  hasBooking: true,
  hasConfirmedBooking: true,
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

  it("returns 100% when all required steps complete", () => {
    const p = computeOnboardingProgress(COMPLETE_SNAPSHOT);
    expect(p.percentage).toBe(100);
    expect(p.isComplete).toBe(true);
  });

  it("next step points to first incomplete required step", () => {
    const snapshot: OnboardingSnapshot = {
      ...EMPTY_SNAPSHOT,
      hasPensionName: true, // first step done
    };
    const p = computeOnboardingProgress(snapshot);
    expect(p.nextStep?.id).toBe("first_building");
  });

  it("counts optional steps in total but not in percentage", () => {
    const snapshot: OnboardingSnapshot = {
      ...COMPLETE_SNAPSHOT,
      teamMemberCount: 0, // optional step incomplete
    };
    const p = computeOnboardingProgress(snapshot);
    expect(p.percentage).toBe(100); // still 100% — optional doesn't count
    expect(p.isComplete).toBe(true);
    expect(p.completedCount).toBe(ONBOARDING_STEPS.length - 1);
  });

  it("has correct required step count", () => {
    expect(REQUIRED_STEP_COUNT).toBe(5);
    expect(ONBOARDING_STEPS).toHaveLength(6); // 5 required + 1 optional
  });

  it("partial progress computes correct percentage", () => {
    const snapshot: OnboardingSnapshot = {
      ...EMPTY_SNAPSHOT,
      hasPensionName: true,
      buildingCount: 1,
      roomCount: 3,
    };
    const p = computeOnboardingProgress(snapshot);
    // 3 out of 5 required = 60%
    expect(p.percentage).toBe(60);
    expect(p.completedCount).toBe(3);
    expect(p.isComplete).toBe(false);
  });
});
