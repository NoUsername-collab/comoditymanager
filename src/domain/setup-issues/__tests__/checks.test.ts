import { describe, it, expect, afterEach } from "vitest";
import {
  APPEARANCE_SETTINGS_PATH,
  BUILDINGS_STRUCTURE_PATH,
  buildingNeedsPaletteColor,
  hasConfiguredContactEmail,
  IDENTITY_SETTINGS_PATH,
  isAdminThemeExplicitlyConfigured,
  resolveBuildingsColorSetupIssue,
  resolveContactEmailSetupIssue,
  resolveMfaSetupIssue,
  resolveThemeSetupIssue,
} from "../checks";
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

describe("isAdminThemeExplicitlyConfigured", () => {
  it("treats appearance save as configured", () => {
    expect(
      isAdminThemeExplicitlyConfigured({
        rawPaletteKey: "noir",
        appearanceSaved: true,
      })
    ).toBe(true);
  });

  it("treats legacy unset keys as unconfigured", () => {
    expect(
      isAdminThemeExplicitlyConfigured({
        rawPaletteKey: "default",
        appearanceSaved: false,
      })
    ).toBe(false);
  });

  it("treats explicit non-default legacy keys as configured", () => {
    expect(
      isAdminThemeExplicitlyConfigured({
        rawPaletteKey: "alpine",
        appearanceSaved: false,
      })
    ).toBe(true);
  });
});

describe("resolveThemeSetupIssue", () => {
  it("flags owners without confirmed appearance", () => {
    const issue = resolveThemeSetupIssue({
      memberRole: "owner",
      rawPaletteKey: "noir",
      appearanceSaved: false,
    });

    expect(issue).toEqual({
      id: SETUP_ISSUE_IDS.THEME_NOT_CONFIGURED,
      severity: "warning",
      settingsPath: APPEARANCE_SETTINGS_PATH,
      labelKey: "themeNotConfigured",
    });
  });

  it("returns null after appearance is saved", () => {
    expect(
      resolveThemeSetupIssue({
        memberRole: "owner",
        rawPaletteKey: "noir",
        appearanceSaved: true,
      })
    ).toBeNull();
  });

  it("returns null for operators", () => {
    expect(
      resolveThemeSetupIssue({
        memberRole: "operator",
        rawPaletteKey: "default",
        appearanceSaved: false,
      })
    ).toBeNull();
  });
});

describe("buildingNeedsPaletteColor", () => {
  it("flags missing palette colors", () => {
    expect(buildingNeedsPaletteColor({ color_hex: null })).toBe(true);
    expect(buildingNeedsPaletteColor({ color_hex: "#2563eb" })).toBe(false);
  });

  it("ignores inactive buildings", () => {
    expect(
      buildingNeedsPaletteColor({ color_hex: null, is_active: false })
    ).toBe(false);
  });
});

describe("resolveBuildingsColorSetupIssue", () => {
  it("flags admins when any active building lacks palette color", () => {
    const issue = resolveBuildingsColorSetupIssue({
      memberRole: "admin",
      buildings: [
        { color_hex: "#2563eb" },
        { color_hex: null },
      ],
    });

    expect(issue).toEqual({
      id: SETUP_ISSUE_IDS.BUILDINGS_NOT_COLORED,
      severity: "warning",
      settingsPath: BUILDINGS_STRUCTURE_PATH,
      labelKey: "buildingsNotColored",
    });
  });

  it("returns null when all active buildings are colored", () => {
    expect(
      resolveBuildingsColorSetupIssue({
        memberRole: "owner",
        buildings: [{ color_hex: "#059669" }],
      })
    ).toBeNull();
  });

  it("returns null when there are no buildings", () => {
    expect(
      resolveBuildingsColorSetupIssue({
        memberRole: "owner",
        buildings: [],
      })
    ).toBeNull();
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
