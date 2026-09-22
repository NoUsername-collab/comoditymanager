import { getTranslations } from "next-intl/server";
import { loadOnboardingPage } from "@/features/onboarding/loaders";
import { OnboardingWizard } from "@/features/onboarding/ui/OnboardingWizard";
import { resolvePensionStayTimes } from "@/lib/constants";
import "@/styles/features/admin/admin-onboarding.css";

export default async function OnboardingPage() {
  const [t, data] = await Promise.all([
    getTranslations("admin.onboarding"),
    loadOnboardingPage(),
  ]);

  return (
    <main className="onboarding-page">
      <div className="onboarding-brand">
        <span className="onboarding-brand__name">Zalmox</span>
      </div>
      <h1 className="onboarding-title">{t("title")}</h1>
      <p className="onboarding-lead">{t("lead")}</p>
      <OnboardingWizard
        initialName={data.settings?.display_name ?? ""}
        initialCheckIn={resolvePensionStayTimes(data.settings).checkIn}
        initialCheckOut={resolvePensionStayTimes(data.settings).checkOut}
        building={data.building}
        roomTypes={data.roomTypes}
        roomCount={data.roomCount}
      />
    </main>
  );
}
