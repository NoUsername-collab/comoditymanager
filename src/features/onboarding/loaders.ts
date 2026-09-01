import { getPensionSettings } from "@/services/pension-settings";

export async function loadOnboardingPage() {
  return getPensionSettings();
}
