import { Suspense } from "react";
import { OnboardingBar } from "./OnboardingBar";

/** Defers onboarding snapshot counts — layout shell paints without blocking. */
export function OnboardingBarLazy() {
  return (
    <Suspense fallback={null}>
      <OnboardingBar />
    </Suspense>
  );
}
