import { getTranslations } from "next-intl/server";
import type {
  GuestAccessBookingSnapshot,
  GuestAppFeatureId,
  GuestAppHotelContent,
  GuestAppSettings,
} from "@/domain/guest-app/types";
import { GuestAppCopyField } from "@/features/guest-app/GuestAppCopyField";
import { GuestAppEmptyState } from "@/features/guest-app/GuestAppEmptyState";
import { GuestEmptyReceptionAction } from "@/features/guest-app/GuestEmptyReceptionAction";
import { GreenStayMockForm } from "@/features/guest-app/GreenStayMockForm";
import { GuestWifiCopyAllButton } from "@/features/guest-app/GuestWifiCopyAllButton";
import { GuestWifiQrCode } from "@/features/guest-app/GuestWifiQrCode";

type Props = {
  featureId: GuestAppFeatureId;
  settings: GuestAppSettings;
  booking: GuestAccessBookingSnapshot;
};

function MockBanner({ message }: { message: string }) {
  return <p className="guest-app__banner-mock">{message}</p>;
}

function mapsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function GuestHotelContactCards({
  hotel,
  tPrefix,
}: {
  hotel: GuestAppHotelContent;
  tPrefix: (key: string) => string;
}) {
  const cards = [
    hotel.phone
      ? { href: `tel:${hotel.phone}`, label: tPrefix("call"), value: hotel.phone, icon: "📞" }
      : null,
    hotel.email
      ? { href: `mailto:${hotel.email}`, label: tPrefix("email"), value: hotel.email, icon: "✉" }
      : null,
    hotel.address
      ? {
          href: mapsUrl(hotel.address),
          label: tPrefix("directions"),
          value: hotel.address,
          icon: "📍",
          external: true,
        }
      : null,
  ].filter(Boolean) as Array<{
    href: string;
    label: string;
    value: string;
    icon: string;
    external?: boolean;
  }>;

  if (cards.length === 0) return null;

  return (
    <div className="guest-app__contact-grid">
      {cards.map((card) => (
        <a
          key={card.label}
          href={card.href}
          target={card.external ? "_blank" : undefined}
          rel={card.external ? "noopener noreferrer" : undefined}
          className="guest-app__contact-card"
        >
          <span className="guest-app__contact-card__icon" aria-hidden>
            {card.icon}
          </span>
          <span className="guest-app__contact-card__label">{card.label}</span>
          <span className="guest-app__contact-card__value">{card.value}</span>
        </a>
      ))}
    </div>
  );
}

export async function GuestAppFeatureScreen({
  featureId,
  settings,
  booking,
}: Props) {
  const t = await getTranslations("guestApp");
  const { content } = settings;
  const receptionPhone = content.hotel?.phone;
  const featureDef = settings.features.find((feature) => feature.id === featureId);
  const showMockBanner = featureDef?.state === "mock";

  return (
    <div className="space-y-4">
      {showMockBanner ? <MockBanner message={t("feature.mockBanner")} /> : null}

      {featureId === "hotel_info" ? (
        <>
          {content.hotel?.longDescription ?? content.hotel?.shortDescription ? (
            <div className="guest-app__subtle space-y-4 text-sm">
              <p className="leading-relaxed">
                {content.hotel.longDescription ?? content.hotel.shortDescription}
              </p>
              <GuestHotelContactCards hotel={content.hotel} tPrefix={(key) => t(`contact.${key}`)} />
              {content.hotel.website ? (
                <p>
                  <span className="guest-app__muted">{t("feature.website")}: </span>
                  <a
                    href={content.hotel.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="guest-app__inline-link"
                  >
                    {content.hotel.website}
                  </a>
                </p>
              ) : null}
            </div>
          ) : (
            <GuestAppEmptyState
              title={t("empty.hotel.title")}
              description={t("empty.hotel.description")}
              action={<GuestEmptyReceptionAction phone={receptionPhone} />}
            />
          )}
        </>
      ) : null}

      {featureId === "wifi" ? (
        content.wifi?.networkName || content.wifi?.password ? (
          <div className="space-y-3">
            {content.wifi.networkName ? (
              <GuestAppCopyField
                label={t("feature.wifiNetwork")}
                value={content.wifi.networkName}
              />
            ) : null}
            {content.wifi.password ? (
              <GuestAppCopyField label={t("feature.wifiPassword")} value={content.wifi.password} />
            ) : null}
            <GuestWifiCopyAllButton wifi={content.wifi} />
            {content.wifi.networkName ? (
              <GuestWifiQrCode
                networkName={content.wifi.networkName}
                password={content.wifi.password}
              />
            ) : null}
            {content.wifi.instructions ? (
              <p className="guest-app__muted text-sm">{content.wifi.instructions}</p>
            ) : null}
          </div>
        ) : (
          <GuestAppEmptyState
            title={t("empty.wifi.title")}
            description={t("empty.wifi.description")}
            action={<GuestEmptyReceptionAction phone={receptionPhone} />}
          />
        )
      ) : null}

      {featureId === "travel_tips" ? (
        (content.travelTips ?? []).length > 0 ? (
          <ul className="guest-app__tip-list">
            {(content.travelTips ?? []).map((tip, index) => (
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
            action={<GuestEmptyReceptionAction phone={receptionPhone} />}
          />
        )
      ) : null}

      {featureId === "green_stay" ? (
        <GreenStayMockForm description={content.greenStay?.description} />
      ) : null}

      {featureId === "gallery" ? (
        <GuestAppEmptyState
          title={t("empty.gallery.title")}
          description={t("empty.gallery.description")}
        />
      ) : null}

      {featureId === "online_checkin" ? (
        <div className="guest-app__panel guest-app__subtle text-sm">
          <p>{t("feature.checkinBody", { name: booking.guestName })}</p>
          <button type="button" disabled className="guest-app__btn-disabled mt-4 w-full">
            {t("feature.checkinCta")}
          </button>
        </div>
      ) : null}

      {(featureId === "services" || featureId === "facilities") ? (
        <ul className="guest-app__tip-list">
          <li className="guest-app__tip-card">{t("feature.demoBreakfast")}</li>
          <li className="guest-app__tip-card">{t("feature.demoParking")}</li>
          <li className="guest-app__tip-card">{t("feature.demoWellness")}</li>
        </ul>
      ) : null}

      {featureId === "online_payment" ? (
        <GuestAppEmptyState
          title={t("empty.payment.title")}
          description={t("empty.payment.description")}
        />
      ) : null}
    </div>
  );
}
