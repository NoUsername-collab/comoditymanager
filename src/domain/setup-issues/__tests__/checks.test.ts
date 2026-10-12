import { describe, it, expect, afterEach } from "vitest";
import {
  hasConfiguredContactEmail,
  IDENTITY_SETTINGS_PATH,
  resolveContactEmailSetupIssue,
  resolveMfaSetupIssue,
  resolveRoomsMissingSetupIssue,
  shouldResolveSetupIssues,
} from "../checks";
import { SETUP_ISSUE_IDS } from "../types";

afterEach(() => {
  delete process.env.ZALMOX_ADMIN_EMAILS;
});

describe("shouldResolveSetupIssues", () => {
  it("skips work for operators", () => {
    expect(
      shouldResolveSetupIssues({ memberRole: "operator", email: "op@test.ro" })
    ).toBe(false);
  });

  it("runs for owners and admins", () => {
    expect(shouldResolveSetupIssues({ memberRole: "owner" })).toBe(true);
    expect(shouldResolveSetupIssues({ memberRole: "admin" })).toBe(true);
  });
});

describe("resolveMfaSetupIssue", () => {
  it("flags owners without verified TOTP", () => {
    const issue = resolveMfaSetupIssue({
      memberRole: "owner",
      factors: { totp: [{ status: "unverified" }] },
    });

    expect(issue).toEqual({
      id: SETUP_ISSUE_IDS.MFA_NOT_ENABLED,
      severity: "warning",
      settingsPath: "/admin/settings/security",
      labelKey: "mfaNotEnabled",
    });
  });

  it("returns null when TOTP is verified", () => {
    expect(
      resolveMfaSetupIssue({
        memberRole: "owner",
        factors: { totp: [{ status: "verified" }] },
      })
    ).toBeNull();
  });

  it("returns null for staff without MFA recommendation", () => {
    expect(
      resolveMfaSetupIssue({
        email: "staff@pension.ro",
        memberRole: "admin",
        factors: null,
      })
    ).toBeNull();
  });

  it("flags platform admin emails without TOTP", () => {
    process.env.ZALMOX_ADMIN_EMAILS = "ops@zalmox.app";

    const issue = resolveMfaSetupIssue({
      email: "ops@zalmox.app",
      memberRole: "admin",
      factors: null,
    });

    expect(issue?.id).toBe(SETUP_ISSUE_IDS.MFA_NOT_ENABLED);
  });
});

describe("hasConfiguredContactEmail", () => {
  it("accepts pension email", () => {
    expect(
      hasConfiguredContactEmail({
        pensionEmail: "contact@pensiune.ro",
        publicSiteEmail: null,
        usePrimaryContact: true,
      })
    ).toBe(true);
  });

  it("accepts public site override email", () => {
    expect(
      hasConfiguredContactEmail({
        pensionEmail: null,
        publicSiteEmail: "site@pensiune.ro",
        usePrimaryContact: false,
      })
    ).toBe(true);
  });
});

describe("resolveContactEmailSetupIssue", () => {
  it("flags owners without any contact email", () => {
    const issue = resolveContactEmailSetupIssue({
      memberRole: "owner",
      pensionEmail: null,
      publicSiteEmail: null,
      usePrimaryContact: true,
    });

    expect(issue).toEqual({
      id: SETUP_ISSUE_IDS.CONTACT_EMAIL_MISSING,
      severity: "warning",
      settingsPath: IDENTITY_SETTINGS_PATH,
      labelKey: "contactEmailMissing",
    });
  });

  it("returns null when pension email exists", () => {
    expect(
      resolveContactEmailSetupIssue({
        memberRole: "owner",
        pensionEmail: "contact@pensiune.ro",
        publicSiteEmail: null,
        usePrimaryContact: true,
      })
    ).toBeNull();
  });
});

describe("resolveRoomsMissingSetupIssue", () => {
  it("flags owners with no rooms", () => {
    const issue = resolveRoomsMissingSetupIssue({
      memberRole: "owner",
      roomCount: 0,
    });

    expect(issue).toEqual({
      id: SETUP_ISSUE_IDS.ROOMS_MISSING,
      severity: "warning",
      settingsPath: "/admin/onboarding",
      labelKey: "roomsMissing",
    });
  });

  it("returns null when a room exists", () => {
    expect(
      resolveRoomsMissingSetupIssue({
        memberRole: "owner",
        roomCount: 2,
      })
    ).toBeNull();
  });

  it("returns null for operators", () => {
    expect(
      resolveRoomsMissingSetupIssue({
        memberRole: "operator",
        roomCount: 0,
      })
    ).toBeNull();
  });
});
