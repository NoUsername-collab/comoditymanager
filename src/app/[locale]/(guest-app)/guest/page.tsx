import { getTranslations } from "next-intl/server";
import { GuestAppShell } from "@/features/guest-app/GuestAppShell";
import { GuestLoyaltyLanding } from "@/features/guest-app/GuestLoyaltyLanding";
import { loadGuestStayMetadata } from "@/features/guest-app/loaders";
import { DEFAULT_GUEST_APP_SETTINGS } from "@/domain/guest-app/defaults";

export default async function GuestLoyaltyIndexPage() {
  const [{ pensionSettings, guestSettings, publicConfig }, t] = await Promise.all([
    loadGuestStayMetadata(),
    getTranslations("guestApp.meta"),
  ]);
  const pensionName = pensionSettings?.display_name ?? t("fallbackName");
  const publicThemeId = publicConfig?.themeId ?? "noir";
  const appearance =
    guestSettings?.appearance ?? DEFAULT_GUEST_APP_SETTINGS.appearance;
  const receptionPhone =
    guestSettings?.content.hotel?.phone?.trim() ||
    publicConfig?.contact.phone?.trim() ||
    null;

  return (
    <GuestAppShell
      appearance={appearance}
      publicThemeId={publicThemeId}
      pensionName={pensionName}
      showNavigation={false}
      receptionPhone={receptionPhone}
      homeHref="/guest"
      headerEyebrow={pensionName}
    >
      <GuestLoyaltyLanding pensionName={pensionName} />
    </GuestAppShell>
  );
}
