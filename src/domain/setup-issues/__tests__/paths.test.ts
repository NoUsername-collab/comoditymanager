import { describe, it, expect } from "vitest";
import {
  APPEARANCE_SETTINGS_PATH,
  BUILDINGS_STRUCTURE_PATH,
  IDENTITY_SETTINGS_PATH,
} from "../checks";
import {
  getIssuesForSettingsPath,
  issueMatchesSettingsPath,
  navItemHasIssues,
} from "../paths";
import type { SetupIssue } from "../types";

const MFA_ISSUE: SetupIssue = {
  id: "mfa-not-enabled",
  severity: "warning",
  settingsPath: "/admin/settings/security",
  labelKey: "mfaNotEnabled",
};

const THEME_ISSUE: SetupIssue = {
  id: "theme-not-configured",
  severity: "warning",
  settingsPath: APPEARANCE_SETTINGS_PATH,
  labelKey: "themeNotConfigured",
};

const BUILDINGS_ISSUE: SetupIssue = {
  id: "buildings-not-colored",
  severity: "warning",
  settingsPath: BUILDINGS_STRUCTURE_PATH,
  labelKey: "buildingsNotColored",
};

const CONTACT_ISSUE: SetupIssue = {
  id: "contact-email-missing",
  severity: "warning",
  settingsPath: IDENTITY_SETTINGS_PATH,
  labelKey: "contactEmailMissing",
};

const ALL_ISSUES = [MFA_ISSUE, THEME_ISSUE, BUILDINGS_ISSUE, CONTACT_ISSUE];

describe("issueMatchesSettingsPath", () => {
  it("matches exact and nested settings routes", () => {
    expect(issueMatchesSettingsPath(MFA_ISSUE, "/admin/settings/security")).toBe(
      true
    );
    expect(
      issueMatchesSettingsPath(MFA_ISSUE, "/admin/settings/security/extra")
    ).toBe(true);
    expect(issueMatchesSettingsPath(MFA_ISSUE, "/admin/settings/email")).toBe(
      false
    );
  });

  it("matches location nav for building color issues", () => {
    expect(
      issueMatchesSettingsPath(BUILDINGS_ISSUE, "/admin/settings/location")
    ).toBe(true);
    expect(
      issueMatchesSettingsPath(
        BUILDINGS_ISSUE,
        "/admin/settings/location/structure"
      )
    ).toBe(true);
  });
});

describe("getIssuesForSettingsPath", () => {
  it("filters issues by nav path", () => {
    expect(
      getIssuesForSettingsPath([MFA_ISSUE], "/admin/settings/security")
    ).toEqual([MFA_ISSUE]);
    expect(getIssuesForSettingsPath([MFA_ISSUE], "/admin/settings")).toEqual([]);
  });

  it("returns onboarding issues for their settings sections", () => {
    expect(
      getIssuesForSettingsPath(ALL_ISSUES, APPEARANCE_SETTINGS_PATH)
    ).toEqual([THEME_ISSUE]);
    expect(
      getIssuesForSettingsPath(ALL_ISSUES, IDENTITY_SETTINGS_PATH)
    ).toEqual([CONTACT_ISSUE]);
    expect(
      getIssuesForSettingsPath(ALL_ISSUES, "/admin/settings/location")
    ).toEqual([BUILDINGS_ISSUE]);
  });
});

describe("navItemHasIssues", () => {
  it("uses matchPath when provided", () => {
    expect(
      navItemHasIssues([MFA_ISSUE], {
        href: "/admin/settings/security",
        matchPath: "/admin/settings/security",
      })
    ).toBe(true);
    expect(
      navItemHasIssues([MFA_ISSUE], {
        href: "/admin/settings",
      })
    ).toBe(false);
  });

  it("highlights location nav when buildings need colors", () => {
    expect(
      navItemHasIssues([BUILDINGS_ISSUE], {
        href: "/admin/settings/location",
        matchPath: "/admin/settings/location",
      })
    ).toBe(true);
  });
});
