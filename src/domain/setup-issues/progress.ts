import { MFA_SETUP_PATH } from "@/lib/auth/admin-path";
import {
  APPEARANCE_SETTINGS_PATH,
  BUILDINGS_STRUCTURE_PATH,
  buildingNeedsPaletteColor,
  hasConfiguredContactEmail,
  IDENTITY_SETTINGS_PATH,
  isAdminThemeExplicitlyConfigured,
  type BuildingColorSnapshot,
} from "./checks";

export const SETUP_PROGRESS_IDS = {
  IDENTITY: "identity",
  CONTACT: "contact",
  THEME: "theme",
  BUILDINGS: "buildings",
  EMAIL: "email",
  MFA: "mfa",
} as const;

export type SetupProgressItemId =
  (typeof SETUP_PROGRESS_IDS)[keyof typeof SETUP_PROGRESS_IDS];

export type SetupProgressItem = {
  id: SetupProgressItemId;
  /** Key under `admin.pages.settings.setupProgress`. */
  labelKey: SetupProgressItemId;
  settingsPath: string;
  done: boolean;
};

const EMAIL_SETTINGS_PATH = "/admin/settings/email";

export function isIdentityConfigured(
  displayName: string | null | undefined,
): boolean {
  const name = displayName?.trim() ?? "";
  return name.length >= 2;
}

export function isEmailChannelConfigured(opts: {
  emailReplyTo?: string | null;
  emailFromName?: string | null;
  emailFromAddress?: string | null;
}): boolean {
  return Boolean(
    opts.emailReplyTo?.trim() ||
      opts.emailFromName?.trim() ||
      opts.emailFromAddress?.trim(),
  );
}

export function areBuildingsColored(
  buildings: BuildingColorSnapshot[],
): boolean {
  if (buildings.length === 0) return true;
  return !buildings.some(buildingNeedsPaletteColor);
}

export type BuildSetupProgressOpts = {
  includeOnboarding: boolean;
  includeMfa: boolean;
  displayName?: string | null;
  pensionEmail?: string | null;
  publicSiteEmail?: string | null;
  usePrimaryContact?: boolean;
  rawPaletteKey?: string | null;
  appearanceSaved?: boolean;
  buildings?: BuildingColorSnapshot[];
  emailReplyTo?: string | null;
  emailFromName?: string | null;
  emailFromAddress?: string | null;
  mfaVerified?: boolean;
};

export function buildSetupProgressItems(
  opts: BuildSetupProgressOpts,
): SetupProgressItem[] {
  const items: SetupProgressItem[] = [];

  if (opts.includeOnboarding) {
    items.push({
      id: SETUP_PROGRESS_IDS.IDENTITY,
      labelKey: SETUP_PROGRESS_IDS.IDENTITY,
      settingsPath: IDENTITY_SETTINGS_PATH,
      done: isIdentityConfigured(opts.displayName),
    });
    items.push({
      id: SETUP_PROGRESS_IDS.CONTACT,
      labelKey: SETUP_PROGRESS_IDS.CONTACT,
      settingsPath: IDENTITY_SETTINGS_PATH,
      done: hasConfiguredContactEmail({
        pensionEmail: opts.pensionEmail,
        publicSiteEmail: opts.publicSiteEmail,
        usePrimaryContact: opts.usePrimaryContact ?? true,
      }),
    });
    items.push({
      id: SETUP_PROGRESS_IDS.THEME,
      labelKey: SETUP_PROGRESS_IDS.THEME,
      settingsPath: APPEARANCE_SETTINGS_PATH,
      done: isAdminThemeExplicitlyConfigured({
        rawPaletteKey: opts.rawPaletteKey,
        appearanceSaved: opts.appearanceSaved ?? false,
      }),
    });
    items.push({
      id: SETUP_PROGRESS_IDS.BUILDINGS,
      labelKey: SETUP_PROGRESS_IDS.BUILDINGS,
      settingsPath: BUILDINGS_STRUCTURE_PATH,
      done: areBuildingsColored(opts.buildings ?? []),
    });
    items.push({
      id: SETUP_PROGRESS_IDS.EMAIL,
      labelKey: SETUP_PROGRESS_IDS.EMAIL,
      settingsPath: EMAIL_SETTINGS_PATH,
      done: isEmailChannelConfigured({
        emailReplyTo: opts.emailReplyTo,
        emailFromName: opts.emailFromName,
        emailFromAddress: opts.emailFromAddress,
      }),
    });
  }

  if (opts.includeMfa) {
    items.push({
      id: SETUP_PROGRESS_IDS.MFA,
      labelKey: SETUP_PROGRESS_IDS.MFA,
      settingsPath: MFA_SETUP_PATH,
      done: opts.mfaVerified === true,
    });
  }

  return items;
}

export function setupProgressSummary(items: SetupProgressItem[]): {
  completed: number;
  total: number;
  percent: number;
} {
  const total = items.length;
  const completed = items.filter((item) => item.done).length;
  const percent = total === 0 ? 100 : Math.round((completed / total) * 100);
  return { completed, total, percent };
}
