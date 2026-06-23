import { navItemHasIssues } from "@/domain/setup-issues/paths";
import type { SetupIssue } from "@/domain/setup-issues/types";
import type { SettingsNavItem } from "@/domain/settings/settings-nav";

export type SettingsSectionStatus = "complete" | "attention";

/** Nav sections that participate in onboarding completion badges. */
export const SETTINGS_COMPLETION_NAV_IDS = new Set<string>([
  "identity",
  "appearance",
  "location",
  "security",
]);

export function resolveSettingsSectionStatus(
  item: Pick<SettingsNavItem, "id" | "href" | "matchPath">,
  setupIssues: SetupIssue[],
): SettingsSectionStatus | null {
  if (navItemHasIssues(setupIssues, item)) {
    return "attention";
  }

  if (SETTINGS_COMPLETION_NAV_IDS.has(item.id)) {
    return "complete";
  }

  return null;
}

export function countCompletionStatuses(
  items: Array<Pick<SettingsNavItem, "id" | "href" | "matchPath">>,
  setupIssues: SetupIssue[],
): { complete: number; tracked: number; attention: number } {
  let complete = 0;
  let tracked = 0;
  let attention = 0;

  for (const item of items) {
    if (!SETTINGS_COMPLETION_NAV_IDS.has(item.id)) continue;
    tracked += 1;
    const status = resolveSettingsSectionStatus(item, setupIssues);
    if (status === "attention") attention += 1;
    if (status === "complete") complete += 1;
  }

  return { complete, tracked, attention };
}
