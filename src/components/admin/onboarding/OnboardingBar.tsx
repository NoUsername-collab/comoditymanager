import { getOnboardingProgress } from "@/services/onboarding";
import { OnboardingChecklist, type ChecklistStep } from "./OnboardingChecklist";

/**
 * Persistent onboarding progress bar — shown in admin layout
 * until all required steps are complete.
 * Server component: fetches progress, serializes for client.
 */
export async function OnboardingBar() {
  let progress;
  try {
    progress = await getOnboardingProgress();
  } catch {
    return null; // Tenant context not available
  }

  // Don't show if onboarding is complete
  if (progress.isComplete) return null;

  // Serialize steps for client (strip functions)
  const clientSteps: ChecklistStep[] = progress.steps.map((s) => ({
    id: s.step.id,
    emoji: s.step.emoji,
    href: s.step.href,
    optional: s.step.optional ?? false,
    completed: s.completed,
  }));

  return (
    <div className="onboarding-bar border-b border-amber-800/30 bg-amber-950/40">
      <div className="mx-auto max-w-5xl px-4 py-3">
        {/* Progress header */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-amber-200">
            Primii pași
          </span>
          <div className="flex-1">
            <div className="h-2 overflow-hidden rounded-full bg-amber-900/50">
              <div
                className="h-full rounded-full bg-amber-400 transition-all duration-500"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
          </div>
          <span className="text-xs font-medium tabular-nums text-amber-300">
            {progress.completedCount}/{progress.totalCount}
          </span>
        </div>

        {/* Steps checklist */}
        <OnboardingChecklist steps={clientSteps} />
      </div>
    </div>
  );
}
