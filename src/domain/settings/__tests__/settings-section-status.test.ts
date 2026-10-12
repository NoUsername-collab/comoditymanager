import { describe, expect, it } from "vitest";
import { SETTINGS_NAV_GROUPS } from "@/domain/settings/settings-nav";
import {
  countCompletionStatuses,
  resolveSettingsSectionStatus,
  SETTINGS_COMPLETION_NAV_IDS,
} from "@/domain/settings/settings-section-status";
import type { SetupIssue } from "@/domain/setup-issues/types";
import { IDENTITY_SETTINGS_PATH } from "@/domain/setup-issues/checks";

const identityItem = SETTINGS_NAV_GROUPS.flatMap((g) => g.items).find(
  (item) => item.id === "identity"
)!;

const appearanceItem = SETTINGS_NAV_GROUPS.flatMap((g) => g.items).find(
  (item) => item.id === "appearance"
)!;

const bookingItem = SETTINGS_NAV_GROUPS.flatMap((g) => g.items).find(
  (item) => item.id === "booking"
)!;

describe("settings-section-status", () => {
  it("marks tracked sections complete when they have no setup issues", () => {
    expect(resolveSettingsSectionStatus(identityItem, [])).toBe("complete");
    expect(resolveSettingsSectionStatus(appearanceItem, [])).toBeNull();
  });

  it("marks sections that need attention when setup issues match", () => {
    const issues: SetupIssue[] = [
      {
        id: "contact-email-missing",
        severity: "warning",
        settingsPath: IDENTITY_SETTINGS_PATH,
        labelKey: "contactEmailMissing",
      },
    ];

    expect(resolveSettingsSectionStatus(identityItem, issues)).toBe("attention");
    expect(resolveSettingsSectionStatus(appearanceItem, issues)).toBeNull();
  });

  it("returns null for sections outside onboarding completion tracking", () => {
    const issues: SetupIssue[] = [
      {
        id: "contact-email-missing",
        severity: "warning",
        settingsPath: IDENTITY_SETTINGS_PATH,
        labelKey: "contactEmailMissing",
      },
    ];

    expect(resolveSettingsSectionStatus(bookingItem, issues)).toBeNull();
  });

  it("counts completion across tracked nav items", () => {
    const trackedItems = SETTINGS_NAV_GROUPS.flatMap((g) => g.items).filter((item) =>
      SETTINGS_COMPLETION_NAV_IDS.has(item.id)
    );

    const summary = countCompletionStatuses(trackedItems, [
      {
        id: "contact-email-missing",
        severity: "warning",
        settingsPath: IDENTITY_SETTINGS_PATH,
        labelKey: "contactEmailMissing",
      },
    ]);

    expect(summary.tracked).toBe(3);
    expect(summary.attention).toBe(1);
    expect(summary.complete).toBe(2);
  });
});
