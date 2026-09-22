/**
 * Onboarding steps — pure domain logic, zero dependencies.
 *
 * Required complete = property name + at least one room.
 * Public site and team invite are optional polish, not first-run gates.
 */

export interface OnboardingSnapshot {
  hasPensionName: boolean;
  buildingCount: number;
  roomCount: number;
  teamMemberCount: number; // excluding owner
  hasPublicPage: boolean;
}

export interface OnboardingStep {
  id: string;
  labelKey: string;
  descriptionKey: string;
  /** URL to navigate when user clicks the step */
  href: string;
  isComplete: (snapshot: OnboardingSnapshot) => boolean;
  optional?: boolean;
}

export const ONBOARDING_PATH = "/admin/onboarding";

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "property",
    labelKey: "steps.property",
    descriptionKey: "steps.propertyDesc",
    href: ONBOARDING_PATH,
    isComplete: (s) => s.hasPensionName,
  },
  {
    id: "inventory",
    labelKey: "steps.inventory",
    descriptionKey: "steps.inventoryDesc",
    href: ONBOARDING_PATH,
    isComplete: (s) => s.roomCount >= 1,
  },
  {
    id: "public_site",
    labelKey: "steps.publicSite",
    descriptionKey: "steps.publicSiteDesc",
    href: "/admin/settings/public-site",
    isComplete: (s) => s.hasPublicPage,
    optional: true,
  },
  {
    id: "invite_team",
    labelKey: "steps.inviteTeam",
    descriptionKey: "steps.inviteTeamDesc",
    href: "/admin/settings/staff",
    isComplete: (s) => s.teamMemberCount >= 1,
    optional: true,
  },
];

/** Total required (non-optional) steps. */
export const REQUIRED_STEP_COUNT = ONBOARDING_STEPS.filter(
  (s) => !s.optional
).length;
