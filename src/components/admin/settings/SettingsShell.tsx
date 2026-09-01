"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import {
  filterSettingsNav,
  resolveActiveSettingsNavId,
  SETTINGS_NAV_GROUPS,
  type SettingsNavGroup,
  type SettingsNavItem,
} from "@/domain/settings/settings-nav";
import { navItemHasIssues } from "@/domain/setup-issues/paths";
import type { SetupIssue } from "@/domain/setup-issues/types";
import { SetupIssueBadge } from "@/components/admin/settings/SetupIssueBadge";

import type { TeamPermissions } from "@/domain/settings/team-permissions";

type Props = {
  role: "admin" | "operator";
  memberRole: "owner" | "admin" | "operator";
  teamPermissions?: TeamPermissions | null;
  propertyName?: string;
  checkInTime?: string;
  checkOutTime?: string;
  setupIssues?: SetupIssue[];
  children: ReactNode;
};

export function SettingsShell({
  role,
  memberRole,
  teamPermissions,
  propertyName,
  checkInTime,
  checkOutTime,
  setupIssues = [],
  children,
}: Props) {
  const t = useTranslations("admin.pages.settings");
  const pathname = usePathname();
  const [query, setQuery] = useState("");

  const navGroups = filterSettingsNav(SETTINGS_NAV_GROUPS, {
    role,
    memberRole,
    teamPermissions,
  });
  const activeId = resolveActiveSettingsNavId(pathname);
  const normalizedQuery = query.trim().toLowerCase();

  const filteredGroups = useMemo(() => {
    if (!normalizedQuery) return navGroups;

    return navGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          const label = t(item.labelKey).toLowerCase();
          const desc = item.descriptionKey ? t(item.descriptionKey).toLowerCase() : "";
          return (
            label.includes(normalizedQuery) ||
            desc.includes(normalizedQuery) ||
            item.id.includes(normalizedQuery)
          );
        }),
      }))
      .filter((group) => group.items.length > 0);
  }, [navGroups, normalizedQuery, t]);

  const jumpItems = useMemo(
    () => navGroups.flatMap((group) => group.items).filter((item) => item.id !== "overview"),
    [navGroups],
  );

  const onOverview = pathname.replace(/\/$/, "") === "/admin/settings";
  const roleLabel =
    memberRole === "owner"
      ? t("roleOwner")
      : role === "admin"
        ? t("roleAdmin")
        : t("roleOperator");

  return (
    <div className="settings-shell grid min-h-[min(72vh,52rem)] grid-cols-1 md:grid-cols-[15.5rem_minmax(0,1fr)]">
      <aside className="settings-shell__nav" aria-label={t("navAria")}>
        <div className="settings-shell__nav-head px-[0.35rem] py-1">
          <p className="m-0 text-[0.6875rem] font-extrabold uppercase tracking-[0.08em] text-[var(--admin-text-muted,#71717a)]">
            {t("navTitle")}
          </p>
          {propertyName ? (
            <p className="mt-[0.2rem] text-[0.9375rem] font-bold leading-[1.3] text-[var(--admin-text,#18181b)]">
              {propertyName}
            </p>
          ) : null}
        </div>

        <label className="settings-shell__search">
          <span className="sr-only">{t("navSearchLabel")}</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("navSearchPlaceholder")}
            className="settings-shell__search-input"
            autoComplete="off"
            enterKeyHint="search"
          />
        </label>

        <nav className="settings-shell__nav-groups">
          {filteredGroups.length > 0 ? (
            filteredGroups.map((group) => (
              <SettingsNavGroupBlock
                key={group.id}
                group={group}
                activeId={activeId}
                setupIssues={setupIssues}
                t={t}
              />
            ))
          ) : (
            <p className="settings-shell__search-empty" role="status">
              {t("navSearchEmpty")}
            </p>
          )}
        </nav>

        <div className="mt-auto border-t border-dashed border-[var(--admin-panel-border,#e4e4e7)] px-[0.35rem] pb-[0.25rem] pt-[0.65rem] text-[0.6875rem]">
          <span className="block font-bold uppercase tracking-[0.06em] text-[var(--admin-text-muted,#71717a)]">
            {t("role")}
          </span>
          <span className="mt-[0.15rem] block font-semibold text-[var(--admin-text,#18181b)]">
            {roleLabel}
          </span>
          {checkInTime && checkOutTime ? (
            <span className="mt-[0.25rem] block text-[var(--admin-text-muted,#71717a)]">
              {checkInTime} → {checkOutTime}
            </span>
          ) : null}
        </div>
      </aside>

      <div className="settings-shell__main">
        {!onOverview && jumpItems.length > 0 ? (
          <nav
            className="settings-quick-jump"
            aria-label={t("quickJumpAria")}
          >
            <div className="settings-quick-jump__scroll">
              {jumpItems.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className={[
                    "settings-quick-jump__chip",
                    item.id === activeId && "settings-quick-jump__chip--active",
                    navItemHasIssues(setupIssues, item) &&
                      "settings-quick-jump__chip--issue",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  aria-current={item.id === activeId ? "page" : undefined}
                >
                  {t(item.labelKey)}
                </Link>
              ))}
            </div>
          </nav>
        ) : null}
        {children}
      </div>
    </div>
  );
}

function SettingsNavGroupBlock({
  group,
  activeId,
  setupIssues,
  t,
}: {
  group: SettingsNavGroup;
  activeId: string;
  setupIssues: SetupIssue[];
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <div className="settings-shell__group">
      <p className="mb-[0.35rem] px-[0.35rem] text-[0.625rem] font-extrabold uppercase tracking-[0.07em] text-[var(--admin-text-muted,#a1a1aa)]">
        {t(group.labelKey)}
      </p>
      <ul className="flex list-none flex-col gap-[0.2rem] p-0">
        {group.items.map((item) => (
          <SettingsNavLink
            key={item.id}
            item={item}
            active={item.id === activeId}
            hasIssue={navItemHasIssues(setupIssues, item)}
            t={t}
          />
        ))}
      </ul>
    </div>
  );
}

function SettingsNavLink({
  item,
  active,
  hasIssue,
  t,
}: {
  item: SettingsNavItem;
  active: boolean;
  hasIssue: boolean;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <li>
      <Link
        href={item.href}
        className={[
          "settings-shell__link",
          "block rounded-xl border border-transparent px-[0.65rem] py-[0.55rem] no-underline transition-[background,border-color] duration-150",
          active && "settings-shell__link--active",
          hasIssue && "settings-shell__link--has-issue",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-current={active ? "page" : undefined}
      >
        <span className="settings-shell__link-row flex items-center justify-between gap-2">
          <span className="settings-shell__link-label block text-[0.8125rem] font-bold text-[var(--admin-text,#18181b)]">
            {t(item.labelKey)}
          </span>
          {hasIssue ? (
            <SetupIssueBadge className="settings-shell__issue-badge" />
          ) : null}
        </span>
        {item.descriptionKey ? (
          <span className="settings-shell__link-desc mt-[0.1rem] block text-[0.6875rem] leading-[1.35] text-[var(--admin-text-muted,#71717a)]">
            {t(item.descriptionKey)}
          </span>
        ) : null}
      </Link>
    </li>
  );
}
