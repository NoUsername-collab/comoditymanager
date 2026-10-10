import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { GuestAppShell } from "@/features/guest-app/GuestAppShell";
import { loadGuestLoyaltyLayout, loadGuestStayMetadata } from "@/features/guest-app/loaders";
import { guestLoyaltyHref } from "@/domain/guest-app/loyalty";
import { DEFAULT_GUEST_APP_SETTINGS } from "@/domain/guest-app/defaults";
import { resolveGuestAppThemeStyle } from "@/features/guest-app/themes/loader";

export async function generateMetadata(): Promise<Metadata> {
  const [{ pensionSettings, guestSettings, publicConfig }, t, tLoyalty] =
    await Promise.all([
      loadGuestStayMetadata(),
      getTranslations("guestApp.meta"),
      getTranslations("guestApp.loyalty"),
    ]);
  const pensionName = pensionSettings?.display_name ?? t("fallbackName");
  const appearance =
    guestSettings?.appearance ?? DEFAULT_GUEST_APP_SETTINGS.appearance;
  const publicThemeId = publicConfig?.themeId ?? "noir";
  const themeStyle = resolveGuestAppThemeStyle(appearance, publicThemeId);
  const themeColor =
    themeStyle["--guest-primary"] ?? themeStyle.backgroundColor ?? "#0f0e14";

  return {
    title: tLoyalty("metaTitle", { name: pensionName }),
    description: tLoyalty("metaDescription", { name: pensionName }),
    themeColor,
    appleWebApp: {
      capable: true,
      title: pensionName,
      statusBarStyle: "default",
    },
  };
}

export default async function GuestLoyaltyRefLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ ref: string }>;
}) {
  const { ref } = await params;
  const {
    pensionName,
    publicThemeId,
    shellAppearance,
    receptionPhone,
    loyalty,
  } = await loadGuestLoyaltyLayout(ref);
  const t = await getTranslations("guestApp.loyalty");
  const tAccess = await getTranslations("guestApp.access");

  if (!loyalty.ok) {
    const title =
      loyalty.reason === "disabled"
        ? t("disabledTitle")
        : loyalty.reason === "blacklisted"
          ? t("unavailableTitle")
          : t("notFoundTitle");
    const body =
      loyalty.reason === "disabled"
        ? t("disabledBody")
        : loyalty.reason === "blacklisted"
          ? t("unavailableBody")
          : t("notFoundBody");
    const phone = receptionPhone?.trim() || null;

    return (
      <GuestAppShell
        appearance={shellAppearance}
        publicThemeId={publicThemeId}
        pensionName={pensionName}
        showNavigation={false}
        receptionPhone={phone}
        homeHref="/guest"
        headerEyebrow={t("eyebrow")}
      >
        <div className="guest-app__alert-error" role="alert">
          <h1 className="guest-app__alert-error__title">{title}</h1>
          <p className="guest-app__alert-error__body">{body}</p>
          {phone ? (
            <a href={`tel:${phone}`} className="guest-app__access-cta">
              {tAccess("callReception")}
            </a>
          ) : null}
        </div>
      </GuestAppShell>
    );
  }

  return (
    <GuestAppShell
      appearance={shellAppearance}
      publicThemeId={publicThemeId}
      pensionName={pensionName}
      showNavigation={false}
      receptionPhone={receptionPhone}
      homeHref={guestLoyaltyHref(loyalty.snapshot.reference)}
      headerEyebrow={t("eyebrow")}
    >
      {children}
    </GuestAppShell>
  );
}
