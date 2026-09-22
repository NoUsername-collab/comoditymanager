"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { markPublicSiteStudioEnter } from "@/features/settings/ui/public-site-studio-enter";
import "@/styles/features/admin/admin-public-site-studio.css";

export function PublicSiteLaunchCard({
  displayName,
  published,
  heroImageUrl,
}: {
  displayName: string;
  published: boolean;
  heroImageUrl?: string | null;
}) {
  const t = useTranslations("admin.pages.publicSite");

  return (
    <section className="pub-site-launch" aria-labelledby="pub-site-launch-title">
      <div className="pub-site-launch__preview" aria-hidden>
        {heroImageUrl?.trim() ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={heroImageUrl} alt="" />
        ) : (
          <p className="pub-site-launch__blank">{displayName}</p>
        )}
      </div>
      <div className="pub-site-launch__body">
        <p className="pub-site-launch__eyebrow">{t("launchEyebrow")}</p>
        <h2 id="pub-site-launch-title" className="pub-site-launch__title">
          {t("launchTitle")}
        </h2>
        <p className="pub-site-launch__lead">{t("launchLead")}</p>
        <p className="pub-site-launch__status">
          {published ? t("launchPublished") : t("studioUnpublished")}
        </p>
        <Link
          href="/admin/settings/public-site"
          className="pub-site-launch__cta"
          onClick={markPublicSiteStudioEnter}
        >
          {t("launchCta")}
        </Link>
      </div>
    </section>
  );
}
