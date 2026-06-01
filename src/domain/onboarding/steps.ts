/**
 * Onboarding steps — pure domain logic, zero dependencies.
 *
 * Each step has an ID, display info, and a check function that
 * receives a snapshot of tenant data and returns whether the step
 * is complete.
 */

export interface OnboardingSnapshot {
  hasPensionName: boolean;
  buildingCount: number;
  roomCount: number;
  hasBooking: boolean;
  hasConfirmedBooking: boolean;
  teamMemberCount: number; // excluding owner
  hasPublicPage: boolean;
}

export interface OnboardingStep {
  id: string;
  emoji: string;
  labelKey: string;       // i18n key
  descriptionKey: string; // i18n key
  /** URL to navigate when user clicks the step */
  href: string;
  /** Check if this step is complete */
  isComplete: (snapshot: OnboardingSnapshot) => boolean;
  /** Is this step optional? (user can skip) */
  optional?: boolean;
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "pension_name",
    emoji: "🏠",
    labelKey: "onboarding.steps.pensionName",
    descriptionKey: "onboarding.steps.pensionNameDesc",
    href: "/admin/settings",
    isComplete: (s) => s.hasPensionName,
  },
  {
    id: "first_building",
    emoji: "🏗️",
    labelKey: "onboarding.steps.firstBuilding",
    descriptionKey: "onboarding.steps.firstBuildingDesc",
    href: "/admin/buildings",
    isComplete: (s) => s.buildingCount >= 1,
  },
  {
    id: "first_room",
    emoji: "🛏️",
    labelKey: "onboarding.steps.firstRoom",
    descriptionKey: "onboarding.steps.firstRoomDesc",
    href: "/admin/rooms/new",
    isComplete: (s) => s.roomCount >= 1,
  },
  {
    id: "test_booking",
    emoji: "📅",
    labelKey: "onboarding.steps.testBooking",
    descriptionKey: "onboarding.steps.testBookingDesc",
    href: "/admin/disponibilitate",
    isComplete: (s) => s.hasBooking,
  },
  {
    id: "confirm_booking",
    emoji: "✅",
    labelKey: "onboarding.steps.confirmBooking",
    descriptionKey: "onboarding.steps.confirmBookingDesc",
    href: "/admin/bookings",
    isComplete: (s) => s.hasConfirmedBooking,
  },
  {
    id: "invite_team",
    emoji: "👥",
    labelKey: "onboarding.steps.inviteTeam",
    descriptionKey: "onboarding.steps.inviteTeamDesc",
    href: "/admin/settings/staff",
    isComplete: (s) => s.teamMemberCount >= 1,
    optional: true,
  },
];

/** Total required (non-optional) steps. */
export const REQUIRED_STEP_COUNT = ONBOARDING_STEPS.filter(
  (s) => !s.optional
).length;
