"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import type { SetupIssue } from "@/domain/setup-issues/types";

type Props = {
  issues: SetupIssue[];
};

/** Actionable setup-issue list inside the gear dropdown. */
export function AdminGearSetupIssues({ issues }: Props) {
  const t = useTranslations("admin.setupIssues");

  if (issues.length === 0) return null;

  return (
    <>
      <div
        className="admin-gear__issues"
        role="group"
        aria-label={t("menuHeading")}
      >
        <p className="admin-gear__issues-heading">{t("menuHeading")}</p>
        <ul className="admin-gear__issues-list">
          {issues.map((issue) => (
            <li key={issue.id}>
              <Link
                href={issue.settingsPath ?? "/admin/settings"}
                className="admin-gear__issue-item"
                role="menuitem"
              >
                {t(issue.labelKey)}
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <div className="admin-gear__sep" />
    </>
  );
}
