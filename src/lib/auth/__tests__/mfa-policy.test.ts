import { describe, it, expect, afterEach } from "vitest";
import {
  hasVerifiedTotpFactor,
  isMfaExemptAdminPath,
  isMfaMandatoryForUser,
  isMfaRecommendedForUser,
} from "@/lib/auth/mfa-policy";

afterEach(() => {
  delete process.env.ZALMOX_ADMIN_EMAILS;
  delete process.env.HOSPIRA_ADMIN_EMAILS;
  delete process.env.NESTIO_ADMIN_EMAILS;
});

describe("isMfaMandatoryForUser", () => {
  it("never blocks app access (2FA optional by default)", () => {
    expect(isMfaMandatoryForUser({ memberRole: "owner" })).toBe(false);
    process.env.HOSPIRA_ADMIN_EMAILS = "ops@hospira.ro";
    expect(
      isMfaMandatoryForUser({ email: "ops@hospira.ro", memberRole: "admin" })
    ).toBe(false);
  });
});

describe("isMfaRecommendedForUser", () => {
  it("recommends MFA for owners", () => {
    expect(isMfaRecommendedForUser({ memberRole: "owner" })).toBe(true);
  });

  it("recommends MFA for platform admin emails", () => {
    process.env.HOSPIRA_ADMIN_EMAILS = "ops@hospira.ro";
    expect(
      isMfaRecommendedForUser({ email: "ops@hospira.ro", memberRole: "admin" })
    ).toBe(true);
  });

  it("does not recommend MFA for regular staff", () => {
    expect(
      isMfaRecommendedForUser({ email: "staff@pension.ro", memberRole: "admin" })
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
