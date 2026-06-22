import { describe, it, expect } from "vitest";
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
});

describe("getIssuesForSettingsPath", () => {
  it("filters issues by nav path", () => {
    expect(
      getIssuesForSettingsPath([MFA_ISSUE], "/admin/settings/security")
    ).toEqual([MFA_ISSUE]);
    expect(getIssuesForSettingsPath([MFA_ISSUE], "/admin/settings")).toEqual([]);
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
});
