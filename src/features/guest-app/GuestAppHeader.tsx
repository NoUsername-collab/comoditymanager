"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/components/public/LanguageSwitcher";
import { guestAppHomeHref } from "@/domain/guest-app/routes";
import type { GuestAppAppearance } from "@/domain/guest-app/types";
import {
  parseGuestAppFeatureSlug,
} from "@/domain/guest-app/routes";

type Props = {
  accessCode: string;
  pensionName: string;
  appearance: GuestAppAppearance;
};

export function GuestAppHeader({ accessCode, pensionName, appearance }: Props) {
  const t = useTranslations("guestApp.shell");
  const pathname = usePathname();
  const homeHref = guestAppHomeHref(accessCode);
  const onHome = pathname === homeHref || pathname.endsWith(homeHref);

  let featureTitle: string | null = null;
  if (!onHome) {
    const marker = `${homeHref}/`;
    const slug = pathname.includes(marker)
      ? pathname.split(marker)[1]?.split("/")[0]
      : null;
    const featureId = slug ? parseGuestAppFeatureSlug(slug) : null;
    if (featureId) {
      featureTitle = t(`featureTitles.${featureId}`);
    }
  }

  return (
    <header className="guest-app__header border-b px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))]">
      <div className="mx-auto flex max-w-lg items-center gap-3">
        {!onHome ? (
          <Link
            href={homeHref}
            className="guest-app__header-back"
            aria-label={t("back")}
          >
            ←
          </Link>
        ) : null}

        {appearance.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={appearance.logoUrl}
            alt={pensionName}
            className="h-10 w-10 shrink-0 rounded-lg object-cover"
          />
        ) : (
          <div
            className="guest-app__logo-fallback flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold"
            aria-hidden
          >
            {pensionName.slice(0, 1).toUpperCase()}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="guest-app__eyebrow truncate text-xs uppercase tracking-widest">
            {t("eyebrow")}
          </p>
          <p className="truncate font-semibold">
            {featureTitle ?? pensionName}
          </p>
        </div>

        <div className="guest-app__locale shrink-0">
          <LanguageSwitcher compact variant="inline" />
        </div>
      </div>
    </header>
  );
}
