import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getOnboardingProgress } from "@/services/onboarding";
import { ONBOARDING_PATH } from "@/domain/onboarding/steps";
import "@/styles/features/admin/admin-onboarding.css";

/**
 * Persistent setup banner — shown in admin layout until required
 * inventory exists (property name + at least one room).
 */
export async function OnboardingBar() {
  let progress;
  try {
    progress = await getOnboardingProgress();
  } catch {
    return null;
  }

  if (progress.isComplete) return null;

  const t = await getTranslations("admin.onboarding");
  const href = progress.nextStep?.href ?? ONBOARDING_PATH;

  return (
    <div className="onboarding-bar">
      <div className="onboarding-bar__inner">
        <div className="onboarding-bar__copy">
          <p className="onboarding-bar__title">{t("bannerTitle")}</p>
          <p className="onboarding-bar__lead">{t("bannerLead")}</p>
        </div>
        <Link href={href} className="onboarding-bar__cta">
          {t("bannerCta")}
        </Link>
      </div>
    </div>
  );
}
