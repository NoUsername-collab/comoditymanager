"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

type Props = {
  href?: string;
  className?: string;
};

export function SettingsViewOnSiteLinkClient({ href = "/", className = "" }: Props) {
  const t = useTranslations("admin.pages.settings");

  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={[
        "settings-primary-link",
        "settings-primary-link--ghost",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {t("viewOnSite")}
    </Link>
  );
}
