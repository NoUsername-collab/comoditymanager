"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import {
  filterSettingsNav,
  SETTINGS_NAV_GROUPS,
} from "@/domain/settings/settings-nav";

import type { ReactNode } from "react";

type Props = {
  role: "admin" | "operator";
  memberRole: "owner" | "admin" | "operator";
  propertyName: string;
  checkInTime: string;
  checkOutTime: string;
  themeSummary: ReactNode;
};

export function SettingsOverview({
  role,
  memberRole,
  propertyName,
  checkInTime,
  checkOutTime,
  themeSummary,
}: Props) {
  const t = useTranslations("admin.pages.settings");
  const navGroups = filterSettingsNav(SETTINGS_NAV_GROUPS, {
    role,
    memberRole,
  });

  const quickItems = navGroups
    .flatMap((g) => g.items)
    .filter((item) => item.id !== "overview");

  return (
    <div className="settings-overview">
      <div className="settings-overview__hero">
        <div className="settings-overview__hero-main">
          <p className="settings-overview__eyebrow">{t("overviewEyebrow")}</p>
          <h2 className="settings-overview__property">{propertyName}</h2>
          <p className="settings-overview__tagline">{t("overviewTagline")}</p>
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

      {navGroups.map((group) => (
        <div key={group.id} className="settings-overview__group">
          <h3 className="settings-overview__group-title">{t(group.labelKey)}</h3>
          <div className="settings-overview__grid">
            {group.items
              .filter((item) => item.id !== "overview")
              .map((item) => (
                <Link key={item.id} href={item.href} className="settings-overview-card">
                  <span className="settings-overview-card__title">{t(item.labelKey)}</span>
                  {item.descriptionKey ? (
                    <span className="settings-overview-card__desc">
                      {t(item.descriptionKey)}
                    </span>
                  ) : null}
                  <span className="settings-overview-card__arrow" aria-hidden>
                    →
                  </span>
                </Link>
              ))}
          </div>
        </div>
      ))}

      {quickItems.length === 0 ? (
        <p className="settings-overview__empty">{t("overviewEmpty")}</p>
      ) : null}
    </div>
  );
}
