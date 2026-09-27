"use client";

import { useTranslations } from "next-intl";
import type {
  GuestAppFeatureDef,
  GuestAppFeatureId,
  GuestAppSettings,
} from "@/domain/guest-app/types";
import { GuestAppCopyField } from "@/features/guest-app/GuestAppCopyField";
import { GuestAppEmptyState } from "@/features/guest-app/GuestAppEmptyState";
import { GuestListItemsPanel } from "@/features/guest-app/GuestListItemsPanel";
import { GuestWifiCopyAllButton } from "@/features/guest-app/GuestWifiCopyAllButton";
import { safeExternalHref } from "@/lib/security/html-escape";

function mapsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function CallReception({ phone }: { phone?: string }) {
  const t = useTranslations("guestApp.empty");
  const normalized = phone?.trim();
  if (!normalized) return null;
  return (
    <a href={`tel:${normalized}`} className="guest-app__empty__cta">
      {t("callReception")}
    </a>
  );
}

export function GuestAppPreviewFeatureBody({
  featureId,
  settings,
  feature,
}: {
  featureId: GuestAppFeatureId;
  settings: GuestAppSettings;
  feature: GuestAppFeatureDef | undefined;
}) {
  const t = useTranslations("guestApp");
  const hotel = settings.content.hotel ?? {};
  const wifi = settings.content.wifi ?? {};
  const tips = settings.content.travelTips ?? [];
  const facilities = settings.content.facilities ?? [];
  const services = settings.content.services ?? [];
  const green = settings.content.greenStay ?? {};
  const mock = feature?.state === "mock";
  const reception = hotel.phone;

  return (
    <div className="space-y-4">
      {mock ? <p className="guest-app__banner-mock">{t("feature.mockBanner")}</p> : null}

      {featureId === "hotel_info" ? (
        hotel.longDescription ||
        hotel.shortDescription ||
        hotel.phone ||
        hotel.email ||
        hotel.address ? (
          <div className="guest-app__subtle space-y-4 text-sm">
            {hotel.longDescription || hotel.shortDescription ? (
              <p className="leading-relaxed">
                {hotel.longDescription || hotel.shortDescription}
              </p>
            ) : null}
            <div className="guest-app__contact-grid">
              {hotel.phone ? (
                <a href={`tel:${hotel.phone}`} className="guest-app__contact-card">
                  <span className="guest-app__contact-card__icon" aria-hidden>
                    📞
                  </span>
                  <span className="guest-app__contact-card__label">{t("contact.call")}</span>
                  <span className="guest-app__contact-card__value">{hotel.phone}</span>
                </a>
              ) : null}
              {hotel.email ? (
                <a href={`mailto:${hotel.email}`} className="guest-app__contact-card">
                  <span className="guest-app__contact-card__icon" aria-hidden>
                    ✉
                  </span>
                  <span className="guest-app__contact-card__label">{t("contact.email")}</span>
                  <span className="guest-app__contact-card__value">{hotel.email}</span>
                </a>
              ) : null}
              {hotel.address ? (
                <a
                  href={mapsUrl(hotel.address)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="guest-app__contact-card"
                >
                  <span className="guest-app__contact-card__icon" aria-hidden>
                    📍
                  </span>
                  <span className="guest-app__contact-card__label">{t("contact.directions")}</span>
                  <span className="guest-app__contact-card__value">{hotel.address}</span>
                </a>
              ) : null}
            </div>
            {hotel.website ? (
              <p>
                <span className="guest-app__muted">{t("feature.website")}: </span>
                <a
                  href={safeExternalHref(hotel.website)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="guest-app__inline-link"
                >
                  {hotel.website}
                </a>
              </p>
            ) : null}
          </div>
        ) : (
          <GuestAppEmptyState
            title={t("empty.hotel.title")}
            description={t("empty.hotel.description")}
            icon="🏠"
            action={<CallReception phone={reception} />}
          />
        )
      ) : null}

      {featureId === "wifi" ? (
        wifi.networkName || wifi.password ? (
          <div className="space-y-3">
            {wifi.networkName ? (
              <GuestAppCopyField label={t("feature.wifiNetwork")} value={wifi.networkName} />
            ) : null}
            {wifi.password ? (
              <GuestAppCopyField label={t("feature.wifiPassword")} value={wifi.password} />
            ) : null}
            <GuestWifiCopyAllButton wifi={wifi} />
            {wifi.instructions ? (
              <p className="guest-app__muted text-sm">{wifi.instructions}</p>
            ) : null}
          </div>
        ) : (
          <GuestAppEmptyState
            title={t("empty.wifi.title")}
            description={t("empty.wifi.description")}
            icon="📶"
            action={<CallReception phone={reception} />}
          />
        )
      ) : null}

      {featureId === "travel_tips" ? (
        tips.length > 0 ? (
          <ul className="guest-app__tip-list">
            {tips.map((tip, index) => (
              <li key={tip} className="guest-app__tip-card">
                <span className="guest-app__tip-card__index" aria-hidden>
                  {index + 1}
                </span>
                <p>{tip}</p>
              </li>
            ))}
          </ul>
        ) : (
          <GuestAppEmptyState
            title={t("empty.tips.title")}
            description={t("empty.tips.description")}
            icon="💡"
            action={<CallReception phone={reception} />}
          />
        )
      ) : null}

      {featureId === "facilities" ? (
        facilities.length > 0 ? (
          <GuestListItemsPanel items={facilities} />
        ) : (
          <GuestAppEmptyState
            title={t("empty.facilities.title")}
            description={t("empty.facilities.description")}
            icon="🏊"
            action={<CallReception phone={reception} />}
          />
        )
      ) : null}

      {featureId === "services" ? (
        services.length > 0 ? (
          <GuestListItemsPanel items={services} />
        ) : (
          <GuestAppEmptyState
            title={t("empty.services.title")}
            description={t("empty.services.description")}
            icon="🛎"
            action={<CallReception phone={reception} />}
          />
        )
      ) : null}

      {featureId === "green_stay" ? (
        <div className="guest-app__panel space-y-3">
          {green.description ? (
            <p className="guest-app__subtle text-sm">{green.description}</p>
          ) : (
            <p className="guest-app__muted text-sm">{t("empty.features.description")}</p>
          )}
        </div>
      ) : null}

      {featureId === "gallery" ? (
        <GuestAppEmptyState
          title={t("empty.gallery.title")}
          description={t("empty.gallery.description")}
          icon="🖼"
          action={<CallReception phone={reception} />}
        />
      ) : null}

      {featureId === "online_checkin" ? (
        <GuestAppEmptyState
          title={t("shell.featureTitles.online_checkin")}
          description={t("featureDesc.online_checkin")}
          icon="✎"
          action={<CallReception phone={reception} />}
        />
      ) : null}

      {featureId === "online_payment" ? (
        <GuestAppEmptyState
          title={t("empty.payment.title")}
          description={t("empty.payment.description")}
          icon="💳"
          action={<CallReception phone={reception} />}
        />
      ) : null}
    </div>
  );
}
