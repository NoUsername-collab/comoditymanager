import { describe, it, expect } from "vitest";
import { IDENTITY_SETTINGS_PATH } from "../checks";
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

const ROOMS_ISSUE: SetupIssue = {
  id: "rooms-missing",
  severity: "warning",
  settingsPath: "/admin/settings/location",
  labelKey: "roomsMissing",
};

const CONTACT_ISSUE: SetupIssue = {
  id: "contact-email-missing",
  severity: "warning",
  settingsPath: IDENTITY_SETTINGS_PATH,
  labelKey: "contactEmailMissing",
};

const ALL_ISSUES = [MFA_ISSUE, ROOMS_ISSUE, CONTACT_ISSUE];

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

  it("matches a buildings page from the location nav, not from settings home", () => {
    const structureIssue: SetupIssue = {
      ...ROOMS_ISSUE,
      settingsPath: "/admin/settings/location/structure",
    };
    expect(
      issueMatchesSettingsPath(structureIssue, "/admin/settings/location")
    ).toBe(true);
    expect(
      issueMatchesSettingsPath(structureIssue, "/admin/settings")
    ).toBe(false);
  });

  it("matches nested location routes", () => {
    expect(
      issueMatchesSettingsPath(ROOMS_ISSUE, "/admin/settings/location")
    ).toBe(true);
    expect(
      issueMatchesSettingsPath(
        ROOMS_ISSUE,
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
      getIssuesForSettingsPath(ALL_ISSUES, IDENTITY_SETTINGS_PATH)
    ).toEqual([CONTACT_ISSUE]);
    expect(
      getIssuesForSettingsPath(ALL_ISSUES, "/admin/settings/location")
    ).toEqual([ROOMS_ISSUE]);
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

  it("highlights location nav when its issue is open", () => {
    expect(
      navItemHasIssues([ROOMS_ISSUE], {
        href: "/admin/settings/location",
        matchPath: "/admin/settings/location",
      })
    ).toBe(true);
  });
});
