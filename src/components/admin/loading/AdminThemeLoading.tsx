"use client";

import { useTranslations } from "next-intl";
import { LocaleFlagSpinner } from "@/components/ui/LocaleFlagSpinner";

type Props = {
  label?: string;
  /** Fixed transparent overlay — spinner only, app stays visible underneath */
  overlay?: boolean;
};

export function AdminThemeLoading({ label, overlay = false }: Props) {
  const tCommon = useTranslations("admin.common");
  const resolvedLabel = label ?? tCommon("loading");

  return (
    <div
      className={[
        "admin-theme-loading",
        overlay && "admin-theme-loading--overlay",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-busy="true"
    >
      <LocaleFlagSpinner label={resolvedLabel} size="lg" />
    </div>
  );
}
