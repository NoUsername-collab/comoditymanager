"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { GuestAppFeatureId, GuestAppSettings } from "@/domain/guest-app/types";
import {
  guestAppThemeClassName,
  resolveGuestAppThemeStyle,
} from "@/features/guest-app/themes/loader";
import { GuestAppEmptyState } from "@/features/guest-app/GuestAppEmptyState";
import { GuestAppCopyField } from "@/features/guest-app/GuestAppCopyField";
import { GuestAppToastProvider } from "@/features/guest-app/GuestAppToast";
import { ChevronRightIcon, GuestFeatureIcon, GuestNavIcon } from "@/features/guest-app/icons";
import { guestAppFeatureBadge } from "@/features/guest-app/feature-labels";
import { buildGuestBottomNav, guestNavLabelKey, type GuestNavTab } from "@/features/guest-app/nav";
import { countStayNights } from "@/domain/guest-app/stay-milestone";
import { formatStayPeriod } from "@/lib/ro-calendar";
import { guestAppPreviewFeatures } from "@/features/settings/ui/guest-app-preview-model";
import { GuestAppPreviewFeatureBody } from "@/features/settings/ui/guest-app-preview-screens";
import "@/styles/features/guest/guest-app.css";
import "@/styles/features/admin/admin-guest-app-preview.css";

const SAMPLE_CODE = "preview";
const SAMPLE_CHECK_IN = "2026-09-26";
const SAMPLE_CHECK_OUT = "2026-09-30";

type PreviewScreen = "home" | GuestAppFeatureId;

function mapsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

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
  const [screen, setScreen] = useState<PreviewScreen>("home");
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (screen === "home") return;
    if (!features.some((feature) => feature.id === screen)) setScreen("home");
  }, [features, screen]);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 });
  }, [screen]);

  function openHome() {
    setScreen("home");
  }

  function openFeature(id: GuestAppFeatureId) {
    setScreen(id);
  }

  function openTab(tab: GuestNavTab) {
    if (tab.id === "home") {
      openHome();
      return;
    }
    if (tab.id === "menu") {
      openHome();
      window.requestAnimationFrame(() => {
        bodyRef.current?.querySelector("#features")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
      return;
    }
    if (tab.featureId) openFeature(tab.featureId);
  }

  const title =
    screen === "home" ? name : t(`shell.featureTitles.${screen}` as "shell.featureTitles.wifi");
  const wifiFeature = features.find((feature) => feature.id === "wifi");
  const primaryCta = hasWifi && wifiFeature ? "wifi" : features[0]?.id ?? null;

  return (
    <GuestAppToastProvider>
      <div className="guest-app-preview">
        <div className="guest-app-preview__phone">
          <div
            className={[className, "guest-app--with-nav", "guest-app-preview__app"].join(" ")}
            style={style}
          >
            <header className="guest-app__header guest-app-preview__header">
              <div className="guest-app-preview__header-row">
                {screen !== "home" ? (
                  <button
                    type="button"
                    className="guest-app__header-back"
                    onClick={openHome}
                    aria-label={t("shell.back")}
                  >
                    ←
                  </button>
                ) : null}
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
                  <p className="truncate font-semibold">{title}</p>
                </div>
              </div>
            </header>

            <div className="guest-app-preview__body" ref={bodyRef}>
              {screen === "home" ? (
                <>
                  <section className="guest-app__hero">
                    <p className="guest-app__hero__eyebrow">
                      {t("home.welcome")}, {tAdmin("previewGuestName")}
                    </p>
                    <h1 className="guest-app__hero__title">{name}</h1>
                    <p className="guest-app__hero__dates">{period}</p>
                    <div className="guest-app__hero__meta">
                      <span className="guest-app__hero__nights">
                        {t("home.nightsCount", { count: nights })}
                      </span>
                      <span className="guest-app__hero__rooms">{tAdmin("previewRoom")}</span>
                    </div>
                    {hotel.shortDescription ? (
                      <p className="guest-app__hero__desc">{hotel.shortDescription}</p>
                    ) : null}
                    {hotel.phone || hotel.address ? (
                      <div className="guest-app__quick-actions">
                        {hotel.phone ? (
                          <a href={`tel:${hotel.phone.trim()}`} className="guest-app__quick-action">
                            <span aria-hidden>📞</span>
                            <span>{t("home.callReception")}</span>
                          </a>
                        ) : null}
                        {hotel.address ? (
                          <a
                            href={mapsUrl(hotel.address.trim())}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="guest-app__quick-action"
                          >
                            <span aria-hidden>📍</span>
                            <span>{t("home.getDirections")}</span>
                          </a>
                        ) : null}
                      </div>
                    ) : null}
                    {primaryCta ? (
                      <div className="guest-app__hero__actions">
                        <button
                          type="button"
                          className="guest-app__primary-cta"
                          onClick={() => openFeature(primaryCta)}
                        >
                          {primaryCta === "wifi"
                            ? t("home.ctaConnectWifi")
                            : t(`features.${primaryCta}`)}
                        </button>
                      </div>
                    ) : null}
                  </section>

                  {hasWifi && wifiFeature ? (
                    <section className="guest-app__wifi-quick">
                      <div className="guest-app__wifi-quick__head">
                        <h2 className="guest-app__wifi-quick__title">{t("home.wifiQuickTitle")}</h2>
                        <button
                          type="button"
                          className="guest-app__wifi-quick__more"
                          onClick={() => openFeature("wifi")}
                        >
                          {t("home.wifiQuickMore")}
                        </button>
                      </div>
                      {wifi.networkName ? (
                        <GuestAppCopyField
                          label={t("home.wifiNetwork")}
                          value={wifi.networkName}
                          compact
                        />
                      ) : null}
                      {wifi.password ? (
                        <GuestAppCopyField
                          label={t("home.wifiPassword")}
                          value={wifi.password}
                          compact
                        />
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
                              <button
                                type="button"
                                className="guest-app__feature-link"
                                onClick={() => openFeature(feature.id)}
                              >
                                <span className="guest-app__feature-link__icon" aria-hidden>
                                  <GuestFeatureIcon id={feature.id} className="h-5 w-5" />
                                </span>
                                <span className="guest-app__feature-link__body">
                                  <span className="guest-app__feature-link__title">
                                    {t(`features.${feature.id}`)}
                                  </span>
                                  <span className="guest-app__feature-link__desc">
                                    {t(
                                      `featureDesc.${feature.id}` as `featureDesc.${GuestAppFeatureId}`,
                                    )}
                                  </span>
                                </span>
                                <span className="guest-app__feature-link__meta">
                                  {badge ? (
                                    <span className="guest-app__badge-mock">{t("badges.demo")}</span>
                                  ) : null}
                                  <ChevronRightIcon className="guest-app__feature-link__chevron h-4 w-4" />
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </section>
                </>
              ) : (
                <GuestAppPreviewFeatureBody
                  featureId={screen}
                  settings={settings}
                  feature={features.find((feature) => feature.id === screen)}
                />
              )}
            </div>

            <nav className="guest-app__bottom-nav guest-app-preview__nav" aria-label={t("shell.navLabel")}>
              <ul
                className="guest-app__bottom-nav__list"
                style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
              >
                {tabs.map((tab) => {
                  const active =
                    tab.id === "menu"
                      ? false
                      : tab.id === "home"
                        ? screen === "home"
                        : screen === tab.featureId;
                  return (
                    <li key={tab.id} className="guest-app__bottom-nav__item">
                      <button
                        type="button"
                        className={[
                          "guest-app__bottom-nav__link",
                          active && "guest-app__bottom-nav__link--active",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        onClick={() => openTab(tab)}
                      >
                        <GuestNavIcon id={tab.id} className="guest-app__bottom-nav__svg" />
                        <span className="guest-app__bottom-nav__label">
                          {t(guestNavLabelKey(tab) as "nav.home")}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {hotel.phone?.trim() ? (
              <a
                href={`tel:${hotel.phone.trim()}`}
                className="guest-app__reception-fab guest-app-preview__fab"
                aria-label={t("shell.callReception")}
              >
                <span aria-hidden>📞</span>
                <span className="guest-app__reception-fab__label">
                  {t("shell.callReceptionShort")}
                </span>
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </GuestAppToastProvider>
  );
}
