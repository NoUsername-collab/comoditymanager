"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import {
  filterSettingsNav,
  resolveActiveSettingsNavId,
  SETTINGS_NAV_GROUPS,
  type SettingsNavGroup,
} from "@/domain/settings/settings-nav";

type SummaryChip = {
  label: string;
  value: ReactNode;
};

type Props = {
  role: "admin" | "operator";
  memberRole: "owner" | "admin" | "operator";
  propertyName?: string;
  checkInTime?: string;
  checkOutTime?: string;
  children: ReactNode;
};

export function SettingsShell({
  role,
  memberRole,
  propertyName,
  checkInTime,
  checkOutTime,
  children,
}: Props) {
  const t = useTranslations("admin.pages.settings");
  const pathname = usePathname();

  const navGroups = filterSettingsNav(SETTINGS_NAV_GROUPS, {
    role,
    memberRole,
  });
  const activeId = resolveActiveSettingsNavId(pathname);

  const roleLabel =
    memberRole === "owner"
      ? t("roleOwner")
      : role === "admin"
        ? t("roleAdmin")
        : t("roleOperator");

  return (
    <div className="settings-shell">
      <aside className="settings-shell__nav" aria-label={t("navAria")}>
        <div className="settings-shell__nav-head">
          <p className="settings-shell__nav-title">{t("navTitle")}</p>
          {propertyName ? (
            <p className="settings-shell__nav-property">{propertyName}</p>
          ) : null}
        </div>

        <nav className="settings-shell__nav-groups">
          {navGroups.map((group) => (
            <SettingsNavGroupBlock
              key={group.id}
              group={group}
              activeId={activeId}
              t={t}
            />
          ))}
        </nav>

        <div className="settings-shell__nav-foot">
          <span className="settings-shell__nav-foot-label">{t("role")}</span>
          <span className="settings-shell__nav-foot-value">{roleLabel}</span>
          {checkInTime && checkOutTime ? (
            <span className="settings-shell__nav-foot-meta">
              {checkInTime} → {checkOutTime}
            </span>
          ) : null}
        </div>
      </aside>

      <div className="settings-shell__main">{children}</div>
    </div>
  );
}

function SettingsNavGroupBlock({
  group,
  activeId,
  t,
}: {
  group: SettingsNavGroup;
  activeId: string;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <div className="settings-shell__group">
      <p className="settings-shell__group-label">{t(group.labelKey)}</p>
      <ul className="settings-shell__group-list">
        {group.items.map((item) => {
          const active = item.id === activeId;
          return (
            <li key={item.id}>
              <Link
                href={item.href}
                className={[
                  "settings-shell__link",
                  active && "settings-shell__link--active",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-current={active ? "page" : undefined}
              >
                <span className="settings-shell__link-label">{t(item.labelKey)}</span>
                {item.descriptionKey ? (
                  <span className="settings-shell__link-desc">{t(item.descriptionKey)}</span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
