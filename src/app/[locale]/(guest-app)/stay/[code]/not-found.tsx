"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

export default function GuestStayNotFound() {
  const t = useTranslations("guestApp.notFound");
  const pathname = usePathname();
  const code = pathname.match(/\/stay\/([^/]+)/)?.[1];

  return (
    <div className="guest-app__alert-warn" role="status">
      <h1 className="guest-app__alert-warn__title">{t("title")}</h1>
      <p className="guest-app__alert-warn__body">{t("body")}</p>
      {code ? (
        <Link
          href={`/stay/${code}`}
          className="guest-app__access-cta"
        >
          {t("backHome")}
        </Link>
      ) : null}
    </div>
  );
}
