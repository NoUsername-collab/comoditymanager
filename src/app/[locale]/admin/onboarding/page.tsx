import { getTranslations } from "next-intl/server";
import { loadOnboardingPage } from "@/features/onboarding/loaders";
import { OnboardingWizard } from "@/features/onboarding/ui/OnboardingWizard";
import { resolvePensionStayTimes } from "@/lib/constants";
import "@/styles/features/admin/admin-onboarding.css";

export default async function OnboardingPage() {
  const [t, settings] = await Promise.all([
    getTranslations("admin.onboarding"),
    loadOnboardingPage(),
  ]);

  return (
    <main className="onboarding-page">
      <div className="onboarding-brand" aria-hidden>
        <span className="onboarding-brand__icon">⚡</span>
        <span className="onboarding-brand__name">Zalmox</span>
      </div>
      <h1 className="onboarding-title">{t("title")}</h1>
      <p className="onboarding-lead">{t("lead")}</p>
      <OnboardingWizard
        initialName={settings?.display_name ?? ""}
        initialCheckIn={resolvePensionStayTimes(settings).checkIn}
        initialCheckOut={resolvePensionStayTimes(settings).checkOut}
        initialTheme={settings?.admin_palette_key ?? "noir"}
        initialMode={settings?.admin_day_night ?? "night"}
      />
    </main>
  );
}
