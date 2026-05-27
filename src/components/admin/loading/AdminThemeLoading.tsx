"use client";

import { useTranslations } from "next-intl";

type Props = {
  label?: string;
  fullScreen?: boolean;
};

export function AdminThemeLoading({
  label,
  fullScreen = false,
}: Props) {
  const tCommon = useTranslations("admin.common");
  const resolvedLabel = label ?? tCommon("loading");

  return (
    <div
      className={[
        "admin-theme-loading",
        fullScreen && "admin-theme-loading--screen",
      ]
        .filter(Boolean)
        .join(" ")}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={resolvedLabel}
    >
      <div className="admin-theme-loading__card">
        <span className="admin-theme-loading__spinner" aria-hidden />
        <span className="admin-theme-loading__text">{resolvedLabel}</span>
        <span className="admin-theme-loading__track" aria-hidden>
          <span className="admin-theme-loading__track-bar" />
        </span>
      </div>
    </div>
  );
}
