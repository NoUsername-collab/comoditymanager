import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { GuestAccessGate } from "@/features/guest-app/GuestAccessGate";
import { GuestAppShell } from "@/features/guest-app/GuestAppShell";
import { visibleGuestAppFeaturesForBooking } from "@/features/guest-app/feature-labels";
import { resolveGuestAppThemeStyle } from "@/features/guest-app/themes/loader";
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

async function resolveGuestSessionSafe(code: string): Promise<GuestAccessResult> {
  try {
    return await resolveGuestSession(code);
  } catch {
    return { ok: false, reason: "not_found" };
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const [pensionSettings, guestSettings, publicConfig, t] = await Promise.all([
    getPensionSettings().catch(() => null),
    getGuestAppSettingsPublic().catch(() => null),
    getPublicSiteConfig().catch(() => null),
    getTranslations("guestApp.meta"),
  ]);
  const pensionName = pensionSettings?.display_name ?? t("fallbackName");
  const appearance = guestSettings?.appearance ?? DEFAULT_GUEST_APP_SETTINGS.appearance;
  const publicThemeId = publicConfig?.themeId ?? "noir";
  const themeStyle = resolveGuestAppThemeStyle(appearance, publicThemeId);
  const themeColor =
    themeStyle["--guest-primary"] ?? themeStyle.backgroundColor ?? "#0f0e14";
  const logoUrl = appearance.logoUrl?.trim();

  return {
    title: t("title", { name: pensionName }),
    description: t("description", { name: pensionName }),
    themeColor,
    appleWebApp: {
      capable: true,
      title: pensionName,
      statusBarStyle: "default",
    },
    ...(logoUrl
      ? {
          icons: {
            apple: [{ url: logoUrl }],
          },
        }
      : {}),
  };
}

export default async function GuestStayLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ code: string }>;
}) {
  const [{ code }, pensionSettings, publicConfig, guestSettings, today, session] =
    await Promise.all([
      params,
      getPensionSettings().catch(() => null),
      getPublicSiteConfig().catch(() => null),
      getGuestAppSettingsPublic().catch(() => null),
      getEffectiveToday(),
      params.then((p) => resolveGuestSessionSafe(p.code)),
    ]);

  const pensionName = pensionSettings?.display_name ?? "Cazare";
  const publicThemeId = publicConfig?.themeId ?? "noir";
  const shellAppearance =
    guestSettings?.appearance ?? DEFAULT_GUEST_APP_SETTINGS.appearance;
  const receptionPhone =
    guestSettings?.content.hotel?.phone?.trim() ||
    publicConfig?.contact.phone?.trim() ||
    null;

  if (!session.ok) {
    return (
      <GuestAccessGate
        accessCode={code}
        pensionName={pensionName}
        appearance={shellAppearance}
        publicThemeId={publicThemeId}
        reason={session.reason}
        schedule={"schedule" in session ? session.schedule : undefined}
        receptionPhone={receptionPhone}
      />
    );
  }

  const visibleFeatures = visibleGuestAppFeaturesForBooking(
    session.settings,
    session.booking,
  );
  const sessionReceptionPhone =
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
      receptionPhone={sessionReceptionPhone}
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
