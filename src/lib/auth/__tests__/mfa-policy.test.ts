import { describe, it, expect, afterEach } from "vitest";
import {
  hasVerifiedTotpFactor,
  isMfaExemptAdminPath,
  isMfaMandatoryForUser,
} from "@/lib/auth/mfa-policy";

afterEach(() => {
  delete process.env.HOSPIRA_ADMIN_EMAILS;
});

describe("isMfaMandatoryForUser", () => {
  it("requires MFA for owners", () => {
    expect(isMfaMandatoryForUser({ memberRole: "owner" })).toBe(true);
  });

  it("requires MFA for platform admin emails", () => {
    process.env.HOSPIRA_ADMIN_EMAILS = "ops@hospira.ro";
    expect(
      isMfaMandatoryForUser({ email: "ops@hospira.ro", memberRole: "admin" })
    ).toBe(true);
  });

  it("does not require MFA for regular staff", () => {
    expect(
      isMfaMandatoryForUser({ email: "staff@pension.ro", memberRole: "admin" })
    ).toBe(false);
    expect(
      isMfaMandatoryForUser({
        email: "staff@pension.ro",
        memberRole: "operator",
      })
    ).toBe(false);
  });
});

describe("hasVerifiedTotpFactor", () => {
  it("detects verified TOTP factors", () => {
    expect(
      hasVerifiedTotpFactor({
        totp: [{ status: "verified" }, { status: "unverified" }],
      })
    ).toBe(true);
    expect(hasVerifiedTotpFactor({ totp: [{ status: "unverified" }] })).toBe(
      false
    );
    expect(hasVerifiedTotpFactor(null)).toBe(false);
  });
});

describe("isMfaExemptAdminPath", () => {
  it("allows login and MFA setup routes", () => {
    expect(isMfaExemptAdminPath("/admin/login")).toBe(true);
    expect(isMfaExemptAdminPath("/admin/settings/security")).toBe(true);
    expect(isMfaExemptAdminPath("/admin")).toBe(false);
  });
});
