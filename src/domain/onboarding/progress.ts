/**
 * Onboarding progress — computed from steps + snapshot.
 * Pure function, no side effects.
 */

import {
  ONBOARDING_STEPS,
  REQUIRED_STEP_COUNT,
  type OnboardingSnapshot,
  type OnboardingStep,
} from "./steps";

export interface StepStatus {
  step: OnboardingStep;
  completed: boolean;
}

export interface OnboardingProgress {
  steps: StepStatus[];
  completedCount: number;
  requiredCount: number;
  totalCount: number;
  /** 0-100 percentage based on required steps only */
  percentage: number;
  /** All required steps done */
  isComplete: boolean;
  /** The next uncompleted step (required first, then optional) */
  nextStep: OnboardingStep | null;
}

export function computeOnboardingProgress(
  snapshot: OnboardingSnapshot
): OnboardingProgress {
  const steps: StepStatus[] = ONBOARDING_STEPS.map((step) => ({
    step,
    completed: step.isComplete(snapshot),
  }));

  const completedRequired = steps.filter(
    (s) => !s.step.optional && s.completed
  ).length;

  const completedCount = steps.filter((s) => s.completed).length;
  const percentage = Math.round((completedRequired / REQUIRED_STEP_COUNT) * 100);
  const isComplete = completedRequired >= REQUIRED_STEP_COUNT;

  // Next step: first incomplete required, or first incomplete optional
  const nextRequired = steps.find((s) => !s.step.optional && !s.completed);
  const nextOptional = steps.find((s) => s.step.optional && !s.completed);
  const nextStep = nextRequired?.step ?? nextOptional?.step ?? null;

  return {
    steps,
    completedCount,
    requiredCount: REQUIRED_STEP_COUNT,
    totalCount: ONBOARDING_STEPS.length,
    percentage,
    isComplete,
    nextStep,
  };
}
