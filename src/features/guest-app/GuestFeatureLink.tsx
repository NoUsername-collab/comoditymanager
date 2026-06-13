"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { GuestAppFeatureDef, GuestAppFeatureId } from "@/domain/guest-app/types";
import { guestAppFeatureHref } from "@/domain/guest-app/routes";
import { guestAppFeatureBadge } from "@/features/guest-app/feature-labels";
import { ChevronRightIcon, GuestFeatureIcon } from "@/features/guest-app/icons";

type Props = {
  accessCode: string;
  feature: GuestAppFeatureDef;
};

export function GuestFeatureLink({ accessCode, feature }: Props) {
  const t = useTranslations("guestApp");
  const badge = guestAppFeatureBadge(feature.state);

  return (
    <Link
      href={guestAppFeatureHref(accessCode, feature.id)}
      className="guest-app__feature-link"
    >
      <span className="guest-app__feature-link__icon" aria-hidden>
        <GuestFeatureIcon id={feature.id} className="h-5 w-5" />
      </span>
      <span className="guest-app__feature-link__body">
        <span className="guest-app__feature-link__title">
          {t(`features.${feature.id}`)}
        </span>
        <span className="guest-app__feature-link__desc">
          {t(`featureDesc.${feature.id}` as `featureDesc.${GuestAppFeatureId}`)}
        </span>
      </span>
      <span className="guest-app__feature-link__meta">
        {badge ? <span className="guest-app__badge-mock">{t("badges.demo")}</span> : null}
        <ChevronRightIcon className="guest-app__feature-link__chevron h-4 w-4" />
      </span>
    </Link>
  );
}
