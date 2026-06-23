import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";

type Props = {
  href?: string;
  className?: string;
};

export async function SettingsViewOnSiteLink({ href = "/", className = "" }: Props) {
  const t = await getTranslations("admin.pages.settings");

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
