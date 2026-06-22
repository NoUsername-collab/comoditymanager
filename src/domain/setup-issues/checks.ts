import { MFA_SETUP_PATH } from "@/lib/auth/admin-path";
import {
  hasVerifiedTotpFactor,
  isMfaRecommendedForUser,
} from "@/lib/auth/mfa-policy";
import { isPlatformAdminEmail } from "@/lib/auth/require-platform-admin";
import { normalizeBuildingColor } from "@/lib/building-color-palette";
import type { TenantMemberRole } from "@/services/tenant-members";
import { SETUP_ISSUE_IDS, type SetupIssue } from "./types";

export const APPEARANCE_SETTINGS_PATH = "/admin/settings/appearance";
export const BUILDINGS_STRUCTURE_PATH = "/admin/settings/location";
export const IDENTITY_SETTINGS_PATH = "/admin/settings/identity";

export type BuildingColorSnapshot = {
  color_hex: string | null;
  is_active?: boolean;
};

export function canReceiveOnboardingSetupIssues(opts: {
  email?: string | null;
  memberRole?: TenantMemberRole | null;
}): boolean {
  if (opts.email && isPlatformAdminEmail(opts.email)) return true;
  return opts.memberRole === "owner" || opts.memberRole === "admin";
}

function hasNonLegacyPaletteKey(raw: string | null | undefined): boolean {
  const key = raw?.trim() ?? "";
  return key.length > 0 && key !== "pension" && key !== "default";
}

export function isAdminThemeExplicitlyConfigured(opts: {
  rawPaletteKey: string | null | undefined;
  appearanceSaved: boolean;
}): boolean {
  if (opts.appearanceSaved) return true;
  return hasNonLegacyPaletteKey(opts.rawPaletteKey) && opts.rawPaletteKey !== "noir";
}

export function buildingNeedsPaletteColor(building: BuildingColorSnapshot): boolean {
  if (building.is_active === false) return false;
  return !normalizeBuildingColor(building.color_hex);
}

export function hasConfiguredContactEmail(opts: {
  pensionEmail: string | null | undefined;
  publicSiteEmail: string | null | undefined;
  usePrimaryContact: boolean;
}): boolean {
  if (opts.pensionEmail?.trim()) return true;
  if (!opts.usePrimaryContact && opts.publicSiteEmail?.trim()) return true;
  return false;
}

export function resolveMfaSetupIssue(opts: {
  email?: string | null;
  memberRole?: TenantMemberRole | null;
  factors: { totp?: Array<{ status?: string }> } | null | undefined;
}): SetupIssue | null {
  if (!isMfaRecommendedForUser({ email: opts.email, memberRole: opts.memberRole })) {
    return null;
  }

  if (hasVerifiedTotpFactor(opts.factors)) {
    return null;
  }

  return {
    id: SETUP_ISSUE_IDS.MFA_NOT_ENABLED,
    severity: "warning",
    settingsPath: MFA_SETUP_PATH,
    labelKey: "mfaNotEnabled",
  };
}

export function resolveThemeSetupIssue(opts: {
  email?: string | null;
  memberRole?: TenantMemberRole | null;
  rawPaletteKey: string | null | undefined;
  appearanceSaved: boolean;
}): SetupIssue | null {
  if (!canReceiveOnboardingSetupIssues(opts)) return null;

  if (
    isAdminThemeExplicitlyConfigured({
      rawPaletteKey: opts.rawPaletteKey,
      appearanceSaved: opts.appearanceSaved,
    })
  ) {
    return null;
  }

  return {
    id: SETUP_ISSUE_IDS.THEME_NOT_CONFIGURED,
    severity: "warning",
    settingsPath: APPEARANCE_SETTINGS_PATH,
    labelKey: "themeNotConfigured",
  };
}

export function resolveBuildingsColorSetupIssue(opts: {
  email?: string | null;
  memberRole?: TenantMemberRole | null;
  buildings: BuildingColorSnapshot[];
}): SetupIssue | null {
  if (!canReceiveOnboardingSetupIssues(opts)) return null;
  if (opts.buildings.length === 0) return null;

  const needsColor = opts.buildings.some(buildingNeedsPaletteColor);
  if (!needsColor) return null;

  return {
    id: SETUP_ISSUE_IDS.BUILDINGS_NOT_COLORED,
    severity: "warning",
    settingsPath: BUILDINGS_STRUCTURE_PATH,
    labelKey: "buildingsNotColored",
  };
}

export function resolveContactEmailSetupIssue(opts: {
  email?: string | null;
  memberRole?: TenantMemberRole | null;
  pensionEmail: string | null | undefined;
  publicSiteEmail: string | null | undefined;
  usePrimaryContact: boolean;
}): SetupIssue | null {
  if (!canReceiveOnboardingSetupIssues(opts)) return null;

  if (
    hasConfiguredContactEmail({
      pensionEmail: opts.pensionEmail,
      publicSiteEmail: opts.publicSiteEmail,
      usePrimaryContact: opts.usePrimaryContact,
    })
  ) {
    return null;
  }

  return {
    id: SETUP_ISSUE_IDS.CONTACT_EMAIL_MISSING,
    severity: "warning",
    settingsPath: IDENTITY_SETTINGS_PATH,
    labelKey: "contactEmailMissing",
  };
}
