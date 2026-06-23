"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import type { SetupIssue } from "@/domain/setup-issues/types";

type Props = {
  issues: SetupIssue[];
  onNavigate?: () => void;
  className?: string;
};

/** Setup-issue links for mobile drawer / overflow menus. */
export function AdminMobileSetupIssues({ issues, onNavigate, className }: Props) {
  const t = useTranslations("admin.setupIssues");

  if (issues.length === 0) return null;

  return (
    <section
      className={["ml-drawer__issues", className].filter(Boolean).join(" ")}
      aria-label={t("menuHeading")}
    >
      <p className="ml-drawer__issues-heading">{t("menuHeading")}</p>
      <ul className="ml-drawer__issues-list">
        {issues.map((issue) => (
          <li key={issue.id}>
            <Link
              href={issue.settingsPath ?? "/admin/settings"}
              className="ml-drawer__issue-link"
              onClick={onNavigate}
            >
              {t(issue.labelKey)}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
