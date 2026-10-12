"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import {
  filterSettingsNav,
  SETTINGS_NAV_GROUPS,
} from "@/domain/settings/settings-nav";
import type { SettingsCompletionSummary } from "@/domain/settings/settings-completion";
import {
  resolveSettingsSectionStatus,
} from "@/domain/settings/settings-section-status";
import { navItemHasIssues } from "@/domain/setup-issues/paths";
import type { SetupIssue } from "@/domain/setup-issues/types";
import { SetupIssueBadge } from "@/components/admin/settings/SetupIssueBadge";
import { SettingsSetupProgress } from "@/features/settings/ui/SettingsSetupProgress";
import { PublicSiteLaunchCard } from "@/features/settings/ui/PublicSiteLaunchCard";

import type { ReactNode } from "react";

import type { TeamPermissions } from "@/domain/settings/team-permissions";

type Props = {
  role: "admin" | "operator";
  memberRole: "owner" | "admin" | "operator";
  teamPermissions?: TeamPermissions | null;
  propertyName: string;
  checkInTime: string;
  checkOutTime: string;
  themeSummary: ReactNode;
  setupIssues?: SetupIssue[];
  completion?: SettingsCompletionSummary | null;
  publicSitePublished?: boolean;
  publicSiteHeroImageUrl?: string | null;
};

export function SettingsOverview({
  role,
  memberRole,
  teamPermissions,
  propertyName,
  checkInTime,
  checkOutTime,
  themeSummary,
  setupIssues = [],
  completion,
  publicSitePublished,
  publicSiteHeroImageUrl,
}: Props) {
  const t = useTranslations("admin.pages.settings");
  const tIssues = useTranslations("admin.setupIssues");
  const navGroups = filterSettingsNav(SETTINGS_NAV_GROUPS, {
    role,
    memberRole,
    teamPermissions,
  });

  const quickItems = navGroups
    .flatMap((g) => g.items)
    .filter((item) => item.id !== "overview");

  const canOpenPublicSite = navGroups.some((group) =>
    group.items.some((item) => item.id === "public-site"),
  );
  const publicCompletionItems = completion?.publicItems ?? [];

  return (
    <div className="settings-overview">
      {setupIssues.length > 0 ? (
        <div className="settings-overview__issues" role="status">
          <p className="settings-overview__issues-title">{tIssues("menuHeading")}</p>
          <ul className="settings-overview__issues-list">
            {setupIssues.map((issue) => (
              <li key={issue.id}>
                <Link
                  href={issue.settingsPath ?? "/admin/settings"}
                  className="settings-overview__issues-link"
                >
                  {tIssues(issue.labelKey)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {completion ? <SettingsSetupProgress summary={completion} /> : null}

      <div className="settings-overview__hero">
        <div className="settings-overview__hero-main">
          <p className="settings-overview__eyebrow">{t("overviewEyebrow")}</p>
          <h2 className="settings-overview__property">{propertyName}</h2>
          <p className="settings-overview__tagline">{t("overviewTagline")}</p>
          {publicSitePublished === false ? (
            <p className="settings-overview__draft-note">{t("completionPublicDraft")}</p>
          ) : null}
        </div>
        <dl className="settings-overview__stats">
          <div>
            <dt>{t("checkTimes")}</dt>
            <dd>
              {checkInTime} → {checkOutTime}
            </dd>
          </div>
          <div>
            <dt>{t("activeTheme")}</dt>
            <dd>{themeSummary}</dd>
          </div>
        </dl>
      </div>

      {canOpenPublicSite ? (
        <PublicSiteLaunchCard
          displayName={propertyName}
          published={publicSitePublished !== false}
          heroImageUrl={publicSiteHeroImageUrl}
        />
      ) : null}

      {publicCompletionItems.length > 0 ? (
        <section className="settings-overview__checklist" aria-labelledby="settings-public-checklist-title">
          <h3 id="settings-public-checklist-title" className="settings-overview__group-title">
            {t("checklistPublicTitle")}
          </h3>
          <ul className="settings-checklist">
            {publicCompletionItems.map((item) => (
              <li key={item.id} className="settings-checklist__item">
                <span
                  className={[
                    "settings-checklist__mark",
                    item.done ? "settings-checklist__mark--done" : "settings-checklist__mark--issue",
                  ].join(" ")}
                  aria-hidden="true"
                >
                  {item.done ? (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <circle cx="7" cy="7" r="6.5" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="1"/>
                      <path d="M4 7l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5"/>
                    </svg>
                  )}
                </span>
                <Link href={item.href} className="settings-checklist__link">
                  {t(item.labelKey)}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {navGroups.map((group) => {
        const items = group.items.filter(
          (item) => item.id !== "overview" && item.id !== "public-site",
        );
        if (items.length === 0) return null;
        return (
        <div key={group.id} className="settings-overview__group">
          <h3 className="settings-overview__group-title">{t(group.labelKey)}</h3>
          <div className="settings-overview__grid">
            {items.map((item) => {
                const hasIssue = navItemHasIssues(setupIssues, item);
                const status = resolveSettingsSectionStatus(item, setupIssues);
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={[
                      "settings-overview-card",
                      hasIssue && "settings-overview-card--has-issue",
                      status === "complete" && "settings-overview-card--complete",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <span className="settings-overview-card__title-row">
                      <span className="settings-overview-card__title">{t(item.labelKey)}</span>
                      {hasIssue ? (
                        <SetupIssueBadge className="settings-overview-card__issue-badge" />
                      ) : status === "complete" ? (
                        <span className="settings-overview-card__status settings-overview-card__status--complete" aria-hidden="true">
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <circle cx="7" cy="7" r="6.5" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="1"/>
                            <path d="M4 7l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </span>
                      ) : null}
                    </span>
                    {item.descriptionKey ? (
                      <span className="settings-overview-card__desc">
                        {t(item.descriptionKey)}
                      </span>
                    ) : null}
                    <span className="settings-overview-card__arrow" aria-hidden>
                      →
                    </span>
                  </Link>
                );
              })}
          </div>
        </div>
        );
      })}

      {quickItems.length === 0 ? (
        <p className="settings-overview__empty">{t("overviewEmpty")}</p>
      ) : null}
    </div>
  );
}
