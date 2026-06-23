import { Suspense } from "react";
import { OnboardingBar } from "./OnboardingBar";

/** Streams onboarding progress — must not block admin shell on every navigation. */
export function OnboardingBarSuspense() {
  return (
    <Suspense fallback={null}>
      <OnboardingBar />
    </Suspense>
  );
}
