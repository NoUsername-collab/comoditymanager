import {
  DEFAULT_CHECKIN_SETTINGS,
  getCheckinSettings,
} from "@/services/checkin";

export async function loadCheckinSettingsPage() {
  return getCheckinSettings().catch(() => DEFAULT_CHECKIN_SETTINGS);
}
