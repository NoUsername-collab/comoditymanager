import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { GuestAccessGate } from "@/features/guest-app/GuestAccessGate";
import { GuestAppShell } from "@/features/guest-app/GuestAppShell";
import { visibleGuestAppFeaturesForBooking } from "@/features/guest-app/feature-labels";
import { DEFAULT_GUEST_APP_SETTINGS } from "@/domain/guest-app/defaults";
import { resolveGuestAccessByCode } from "@/services/guest-app/access";
import { getGuestAppSettingsPublic } from "@/services/guest-app/settings";
import { getPensionSettings } from "@/services/pension-settings";
import { getPublicSiteConfig } from "@/services/public-site/queries";
import type { GuestAccessResult } from "@/domain/guest-app/types";
import { getEffectiveToday } from "@/domain/simulation/sim-clock";

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

export async function generateMetadata(): Promise<Metadata> {
  const [pensionSettings, t] = await Promise.all([
    getPensionSettings().catch(() => null),
    getTranslations("guestApp.meta"),
  ]);
  const pensionName = pensionSettings?.display_name ?? t("fallbackName");

  return {
    title: t("title", { name: pensionName }),
    description: t("description", { name: pensionName }),
    appleWebApp: {
      capable: true,
      title: pensionName,
    },
  };
}

export default async function GuestStayLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ code: string }>;
}) {
  const [{ code }, pensionSettings, publicConfig, guestSettings, tAccess, today] =
    await Promise.all([
      params,
      getPensionSettings().catch(() => null),
      getPublicSiteConfig().catch(() => null),
      getGuestAppSettingsPublic().catch(() => null),
      getTranslations("guestApp.access"),
      getEffectiveToday(),
    ]);

  const pensionName = pensionSettings?.display_name ?? "Cazare";
  const publicThemeId = publicConfig?.themeId ?? "noir";
  const shellAppearance =
    guestSettings?.appearance ?? DEFAULT_GUEST_APP_SETTINGS.appearance;

  let session: GuestAccessResult;
  try {
    session = await resolveGuestSession(code);
  } catch {
    return (
      <GuestAccessGate
        accessCode={code}
        pensionName={pensionName}
        appearance={shellAppearance}
        publicThemeId={publicThemeId}
        reason="not_found"
        message={tAccess("errors.serviceUnavailable")}
      />
    );
  }

  if (!session.ok) {
    return (
      <GuestAccessGate
        accessCode={code}
        pensionName={pensionName}
        appearance={shellAppearance}
        publicThemeId={publicThemeId}
        reason={session.reason}
        schedule={session.schedule}
      />
    );
  }

  const visibleFeatures = visibleGuestAppFeaturesForBooking(
    session.settings,
    session.booking,
  );
  const receptionPhone =
    session.settings.content.hotel?.phone?.trim() ||
    publicConfig?.contact.phone?.trim() ||
    null;

  return (
    <GuestAppShell
      accessCode={session.accessCode}
      appearance={session.settings.appearance}
      publicThemeId={publicThemeId}
      pensionName={pensionName}
      features={visibleFeatures}
      receptionPhone={receptionPhone}
      stayProgress={{
        today,
        checkIn: session.booking.checkIn,
        checkOut: session.booking.checkOut,
      }}
    >
      {children}
    </GuestAppShell>
  );
}
