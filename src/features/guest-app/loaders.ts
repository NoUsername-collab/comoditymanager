import { DEFAULT_GUEST_APP_SETTINGS } from "@/domain/guest-app/defaults";
import type { GuestAccessResult } from "@/domain/guest-app/types";
import { todayIso } from "@/lib/stay-dates";
import { resolveGuestAccessByCode } from "@/services/guest-app/access";
import { resolveGuestAppContext } from "@/services/guest-app/resolve-context";
import { getGuestAppSettingsPublic } from "@/services/guest-app/settings";
import { getPensionSettings } from "@/services/pension-settings";
import { getPublicSiteConfig } from "@/services/public-site/queries";

async function resolveGuestSession(code: string): Promise<GuestAccessResult> {
  try {
    return await resolveGuestAccessByCode(code);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Nu puteți accesa această pagină.";
    if (message.includes("auth.tenant_host_required")) {
      return { ok: false, reason: "wrong_host" };
    }
    throw error;
  }
}

async function resolveGuestSessionSafe(code: string): Promise<GuestAccessResult> {
  try {
    return await resolveGuestSession(code);
  } catch {
    return { ok: false, reason: "not_found" };
  }
}

export async function loadGuestStayMetadata() {
  const [pensionSettings, guestSettings, publicConfig] = await Promise.all([
    getPensionSettings().catch(() => null),
    getGuestAppSettingsPublic().catch(() => null),
    getPublicSiteConfig().catch(() => null),
  ]);
  return { pensionSettings, guestSettings, publicConfig };
}

export async function loadGuestStayLayout(code: string) {
  const [pensionSettings, publicConfig, guestSettings, today, session] =
    await Promise.all([
      getPensionSettings().catch(() => null),
      getPublicSiteConfig().catch(() => null),
      getGuestAppSettingsPublic().catch(() => null),
      todayIso(),
      resolveGuestSessionSafe(code),
    ]);

  const pensionName = pensionSettings?.display_name ?? "Cazare";
  const publicThemeId = publicConfig?.themeId ?? "noir";
  const shellAppearance =
    guestSettings?.appearance ?? DEFAULT_GUEST_APP_SETTINGS.appearance;
  const receptionPhone =
    guestSettings?.content.hotel?.phone?.trim() ||
    publicConfig?.contact.phone?.trim() ||
    null;

  return {
    pensionSettings,
    publicConfig,
    guestSettings,
    today,
    session,
    pensionName,
    publicThemeId,
    shellAppearance,
    receptionPhone,
  };
}

export async function loadGuestStayHome(code: string, locale: string) {
  const today = todayIso();
  const [pensionSettings, session] = await Promise.all([
    getPensionSettings().catch(() => null),
    resolveGuestSessionSafe(code),
  ]);
  if (!session.ok) {
    return { ok: false as const, today, pensionSettings, session };
  }
  const ctx = await resolveGuestAppContext(
    session.settings,
    session.booking,
    locale,
  );
  return { ok: true as const, today, pensionSettings, session, ctx };
}

export async function loadGuestStayFeature(code: string, locale: string) {
  const today = todayIso();
  const session = await resolveGuestSessionSafe(code);
  if (!session.ok) {
    return { ok: false as const, today, session };
  }
  const ctx = await resolveGuestAppContext(
    session.settings,
    session.booking,
    locale,
  );
  return { ok: true as const, today, session, ctx };
}
