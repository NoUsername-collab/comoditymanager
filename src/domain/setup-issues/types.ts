export type SetupIssueSeverity = "warning" | "critical";

export type SetupIssue = {
  id: string;
  severity: SetupIssueSeverity;
  /** Admin settings route where the issue can be resolved. */
  settingsPath?: string;
  /** Key under `admin.setupIssues` for i18n. */
  labelKey: string;
};

export const SETUP_ISSUE_IDS = {
  MFA_NOT_ENABLED: "mfa-not-enabled",
} as const;
