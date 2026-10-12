import { ONBOARDING_PATH } from "@/domain/onboarding/steps";
import { localeRedirect as redirect } from "@/i18n/server-redirect";

/** The welcome wizard is gone. Setup continues on buildings and rooms. */
export default async function OnboardingPage() {
  await redirect(ONBOARDING_PATH);
}
