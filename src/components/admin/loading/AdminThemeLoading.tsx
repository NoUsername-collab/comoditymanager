"use client";

import { useTranslations } from "next-intl";
import { LocaleFlagSpinner } from "@/components/ui/LocaleFlagSpinner";

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
    >
      <div className="admin-theme-loading__stack">
        <LocaleFlagSpinner label={resolvedLabel} size="lg" />
        <span className="admin-theme-loading__label">{resolvedLabel}</span>
      </div>
    </div>
  );
}
