import { getTranslations } from "next-intl/server";
import { getPensionSettings } from "@/services/pension-settings";
import { OnboardingWizard } from "@/components/admin/onboarding/OnboardingWizard";
import "@/app/admin/admin-onboarding.css";

export default async function OnboardingPage() {
  const [t, settings] = await Promise.all([
    getTranslations("admin.onboarding"),
    getPensionSettings(),
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
        initialCheckIn={settings?.default_check_in_time ?? "14:00"}
        initialCheckOut={settings?.default_check_out_time ?? "12:00"}
        initialTheme={settings?.admin_palette_key ?? "noir"}
        initialMode={settings?.admin_day_night ?? "night"}
      />
    </main>
  );
}
