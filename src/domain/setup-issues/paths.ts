import type { SetupIssue } from "./types";

function normalizePath(path: string): string {
  return path.replace(/\/$/, "") || "/";
}

export function issueMatchesSettingsPath(
  issue: SetupIssue,
  navPath: string
): boolean {
  if (!issue.settingsPath) return false;

  const normalizedNav = normalizePath(navPath);
  const normalizedIssue = normalizePath(issue.settingsPath);

  return (
    normalizedNav === normalizedIssue ||
    normalizedNav.startsWith(`${normalizedIssue}/`)
  );
}

export function getIssuesForSettingsPath(
  issues: SetupIssue[],
  navPath: string
): SetupIssue[] {
  return issues.filter((issue) => issueMatchesSettingsPath(issue, navPath));
}

export function navItemHasIssues(
  issues: SetupIssue[],
  item: { href: string; matchPath?: string }
): boolean {
  const path = item.matchPath ?? item.href;
  return getIssuesForSettingsPath(issues, path).length > 0;
}
