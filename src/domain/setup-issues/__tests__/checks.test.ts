import { describe, it, expect, afterEach } from "vitest";
import { resolveMfaSetupIssue } from "../checks";
import { SETUP_ISSUE_IDS } from "../types";

afterEach(() => {
  delete process.env.HOSPIRA_ADMIN_EMAILS;
  delete process.env.NESTIO_ADMIN_EMAILS;
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
    process.env.HOSPIRA_ADMIN_EMAILS = "ops@hospira.ro";

    const issue = resolveMfaSetupIssue({
      email: "ops@hospira.ro",
      memberRole: "admin",
      factors: null,
    });

    expect(issue?.id).toBe(SETUP_ISSUE_IDS.MFA_NOT_ENABLED);
  });
});
