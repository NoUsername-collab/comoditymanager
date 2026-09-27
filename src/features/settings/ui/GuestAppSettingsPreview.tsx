"use client";

import { useLocale, useTranslations } from "next-intl";
import type { GuestAppFeatureId, GuestAppSettings } from "@/domain/guest-app/types";
import {
  guestAppThemeClassName,
  resolveGuestAppThemeStyle,
} from "@/features/guest-app/themes/loader";
import { GuestAppEmptyState } from "@/features/guest-app/GuestAppEmptyState";
import { ChevronRightIcon, GuestFeatureIcon, GuestNavIcon } from "@/features/guest-app/icons";
import { guestAppFeatureBadge } from "@/features/guest-app/feature-labels";
import { buildGuestBottomNav, guestNavLabelKey } from "@/features/guest-app/nav";
import { countStayNights } from "@/domain/guest-app/stay-milestone";
import { formatStayPeriod } from "@/lib/ro-calendar";
import { guestAppPreviewFeatures } from "@/features/settings/ui/guest-app-preview-model";
import "@/styles/features/guest/guest-app.css";
import "@/styles/features/admin/admin-guest-app-preview.css";

const SAMPLE_CODE = "preview";
const SAMPLE_CHECK_IN = "2026-09-22";
const SAMPLE_CHECK_OUT = "2026-09-25";

export function GuestAppSettingsPreview({
  settings,
  displayName,
  publicThemeId,
}: {
  settings: GuestAppSettings;
  displayName: string;
  publicThemeId: string;
}) {
  const t = useTranslations("guestApp");
  const tAdmin = useTranslations("admin.pages.guestApp");
  const locale = useLocale();
  const features = guestAppPreviewFeatures(settings);
  const hotel = settings.content.hotel ?? {};
  const wifi = settings.content.wifi ?? {};
  const appearance = settings.appearance;
  const style = resolveGuestAppThemeStyle(appearance, publicThemeId);
  const className = guestAppThemeClassName(appearance, publicThemeId);
  const period = formatStayPeriod(SAMPLE_CHECK_IN, SAMPLE_CHECK_OUT, locale, true);
  const nights = countStayNights(SAMPLE_CHECK_IN, SAMPLE_CHECK_OUT);
  const tabs = buildGuestBottomNav(SAMPLE_CODE, features);
  const hasWifi = Boolean(wifi.networkName || wifi.password);
  const name = displayName.trim() || t("meta.fallbackName");

  return (
    <div className="guest-app-preview">
      <p className="guest-app-preview__hint">{tAdmin("previewHint")}</p>
      <div className="guest-app-preview__phone">
        <div
          className={[className, "guest-app--with-nav", "guest-app-preview__app"].join(" ")}
          style={style}
        >
          <header className="guest-app__header guest-app-preview__header">
            <div className="guest-app-preview__header-row">
              {appearance.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={appearance.logoUrl}
                  alt=""
                  width={40}
                  height={40}
                  className="guest-app__logo shrink-0"
                />
              ) : (
                <div className="guest-app__logo-fallback flex shrink-0 items-center justify-center text-sm font-bold">
                  {name.slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="guest-app__eyebrow truncate text-xs uppercase tracking-widest">
                  {t("shell.eyebrow")}
                </p>
                <p className="truncate font-semibold">{name}</p>
              </div>
            </div>
          </header>

          <div className="guest-app-preview__body">
            <section className="guest-app__hero">
              <p className="guest-app__hero__eyebrow">
                {t("home.welcome")}, {tAdmin("previewGuestName")}
              </p>
              <h1 className="guest-app__hero__title">{name}</h1>
              <p className="guest-app__hero__dates">{period}</p>
              <div className="guest-app__hero__meta">
                <span className="guest-app__hero__nights">{t("home.nightsCount", { count: nights })}</span>
                <span className="guest-app__hero__rooms">{tAdmin("previewRoom")}</span>
              </div>
              {hotel.shortDescription ? (
                <p className="guest-app__hero__desc">{hotel.shortDescription}</p>
              ) : null}
            </section>

            {hasWifi && features.some((feature) => feature.id === "wifi") ? (
              <section className="guest-app__wifi-quick">
                <div className="guest-app__wifi-quick__head">
                  <h2 className="guest-app__wifi-quick__title">{t("home.wifiQuickTitle")}</h2>
                </div>
                {wifi.networkName ? (
                  <p className="guest-app-preview__kv">
                    <span>{t("home.wifiNetwork")}</span>
                    <strong>{wifi.networkName}</strong>
                  </p>
                ) : null}
                {wifi.password ? (
                  <p className="guest-app-preview__kv">
                    <span>{t("home.wifiPassword")}</span>
                    <strong>{wifi.password}</strong>
                  </p>
                ) : null}
              </section>
            ) : null}

            <section id="features">
              <h2 className="guest-app__section-title">{t("home.sectionFeatures")}</h2>
              {features.length === 0 ? (
                <GuestAppEmptyState
                  title={t("empty.features.title")}
                  description={t("empty.features.description")}
                  icon="✦"
                />
              ) : (
                <ul className="guest-app__feature-list">
                  {features.map((feature) => {
                    const badge = guestAppFeatureBadge(feature);
                    return (
                      <li key={feature.id}>
                        <span className="guest-app__feature-link">
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
                            {badge ? (
                              <span className="guest-app__badge-mock">{t("badges.demo")}</span>
                            ) : null}
                            <ChevronRightIcon className="guest-app__feature-link__chevron h-4 w-4" />
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>

          <nav className="guest-app__bottom-nav guest-app-preview__nav" aria-hidden>
            <ul
              className="guest-app__bottom-nav__list"
              style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
            >
              {tabs.map((tab) => (
                <li key={tab.id} className="guest-app__bottom-nav__item">
                  <span
                    className={[
                      "guest-app__bottom-nav__link",
                      tab.id === "home" && "guest-app__bottom-nav__link--active",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <GuestNavIcon id={tab.id} className="guest-app__bottom-nav__svg" />
                    <span className="guest-app__bottom-nav__label">
                      {t(guestNavLabelKey(tab) as "nav.home")}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </nav>

          {!settings.enabled ? (
            <div className="guest-app-preview__off" role="status">
              <p>{tAdmin("previewDisabled")}</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
