import { getTranslations } from "next-intl/server";
import type { GuestAppFeatureId } from "@/domain/guest-app/types";
import type { GuestAppResolvedContext } from "@/services/guest-app/resolve-context";
import { GuestAppCopyField } from "@/features/guest-app/GuestAppCopyField";
import { GuestAppEmptyState } from "@/features/guest-app/GuestAppEmptyState";
import { GuestEmptyReceptionAction } from "@/features/guest-app/GuestEmptyReceptionAction";
import { GuestGalleryGrid } from "@/features/guest-app/GuestGalleryGrid";
import { GuestGreenStayForm } from "@/features/guest-app/GuestGreenStayForm";
import { GuestListItemsPanel } from "@/features/guest-app/GuestListItemsPanel";
import { GuestOnlineCheckinForm } from "@/features/guest-app/GuestOnlineCheckinForm";
import { GuestPaymentSummary } from "@/features/guest-app/GuestPaymentSummary";
import { GuestWifiCopyAllButton } from "@/features/guest-app/GuestWifiCopyAllButton";
import { GuestWifiQrCode } from "@/features/guest-app/GuestWifiQrCode";
import { isGuestFeatureReady } from "@/features/guest-app/feature-labels";

type Props = {
  featureId: GuestAppFeatureId;
  accessCode: string;
  today: string;
  ctx: GuestAppResolvedContext;
};

function MockBanner({ message }: { message: string }) {
  return <p className="guest-app__banner-mock">{message}</p>;
}

function mapsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

export async function GuestAppFeatureScreen({
  featureId,
  accessCode,
  today,
  ctx,
}: Props) {
  const t = await getTranslations("guestApp");
  const featureDef = ctx.settings.features.find((feature) => feature.id === featureId);
  const showMockBanner =
    featureDef?.state === "mock" ||
    (featureDef?.state === "live" && !isGuestFeatureReady(featureId, ctx));
  const receptionPhone = ctx.hotel.phone;

  return (
    <div className="space-y-4">
      {showMockBanner ? <MockBanner message={t("feature.mockBanner")} /> : null}

      {featureId === "hotel_info" ? (
        ctx.hotel.longDescription ||
        ctx.hotel.shortDescription ||
        ctx.hotel.phone ||
        ctx.hotel.email ||
        ctx.hotel.address ? (
          <div className="guest-app__subtle space-y-4 text-sm">
            {(ctx.hotel.longDescription || ctx.hotel.shortDescription) && (
              <p className="leading-relaxed">
                {ctx.hotel.longDescription ?? ctx.hotel.shortDescription}
              </p>
            )}
            <div className="guest-app__contact-grid">
              {ctx.hotel.phone ? (
                <a href={`tel:${ctx.hotel.phone}`} className="guest-app__contact-card">
                  <span className="guest-app__contact-card__icon" aria-hidden>
                    📞
                  </span>
                  <span className="guest-app__contact-card__label">{t("contact.call")}</span>
                  <span className="guest-app__contact-card__value">{ctx.hotel.phone}</span>
                </a>
              ) : null}
              {ctx.hotel.email ? (
                <a href={`mailto:${ctx.hotel.email}`} className="guest-app__contact-card">
                  <span className="guest-app__contact-card__icon" aria-hidden>
                    ✉
                  </span>
                  <span className="guest-app__contact-card__label">{t("contact.email")}</span>
                  <span className="guest-app__contact-card__value">{ctx.hotel.email}</span>
                </a>
              ) : null}
              {ctx.hotel.address ? (
                <a
                  href={mapsUrl(ctx.hotel.address)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="guest-app__contact-card"
                >
                  <span className="guest-app__contact-card__icon" aria-hidden>
                    📍
                  </span>
                  <span className="guest-app__contact-card__label">{t("contact.directions")}</span>
                  <span className="guest-app__contact-card__value">{ctx.hotel.address}</span>
                </a>
              ) : null}
            </div>
            {ctx.hotel.website ? (
              <p>
                <span className="guest-app__muted">{t("feature.website")}: </span>
                <a
                  href={ctx.hotel.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="guest-app__inline-link"
                >
                  {ctx.hotel.website}
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
        )
      ) : null}

      {featureId === "wifi" ? (
        ctx.wifi?.networkName || ctx.wifi?.password ? (
          <div className="space-y-3">
            {ctx.wifi.networkName ? (
              <GuestAppCopyField label={t("feature.wifiNetwork")} value={ctx.wifi.networkName} />
            ) : null}
            {ctx.wifi.password ? (
              <GuestAppCopyField label={t("feature.wifiPassword")} value={ctx.wifi.password} />
            ) : null}
            <GuestWifiCopyAllButton wifi={ctx.wifi} />
            {ctx.wifi.networkName ? (
              <GuestWifiQrCode networkName={ctx.wifi.networkName} password={ctx.wifi.password} />
            ) : null}
            {ctx.wifi.instructions ? (
              <p className="guest-app__muted text-sm">{ctx.wifi.instructions}</p>
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
        ctx.travelTips.length > 0 ? (
          <ul className="guest-app__tip-list">
            {ctx.travelTips.map((tip, index) => (
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
        <GuestGreenStayForm
          accessCode={accessCode}
          description={ctx.greenStay?.description}
          today={today}
          pendingDates={ctx.greenStayPendingDates}
        />
      ) : null}

      {featureId === "gallery" ? (
        ctx.galleryItems.length > 0 ? (
          <GuestGalleryGrid items={ctx.galleryItems} />
        ) : (
          <GuestAppEmptyState
            title={t("empty.gallery.title")}
            description={t("empty.gallery.description")}
            action={<GuestEmptyReceptionAction phone={receptionPhone} />}
          />
        )
      ) : null}

      {featureId === "online_checkin" ? (
        <GuestOnlineCheckinForm
          accessCode={accessCode}
          booking={ctx.booking}
          prefill={ctx.precheckinPrefill}
          alreadySubmitted={ctx.precheckinSubmitted}
        />
      ) : null}

      {featureId === "facilities" ? (
        ctx.facilities.length > 0 ? (
          <GuestListItemsPanel items={ctx.facilities} />
        ) : (
          <GuestAppEmptyState
            title={t("empty.facilities.title")}
            description={t("empty.facilities.description")}
            action={<GuestEmptyReceptionAction phone={receptionPhone} />}
          />
        )
      ) : null}

      {featureId === "services" ? (
        ctx.services.length > 0 ? (
          <GuestListItemsPanel items={ctx.services} />
        ) : (
          <GuestAppEmptyState
            title={t("empty.services.title")}
            description={t("empty.services.description")}
            action={<GuestEmptyReceptionAction phone={receptionPhone} />}
          />
        )
      ) : null}

      {featureId === "online_payment" ? (
        ctx.booking.totalPrice != null && ctx.booking.totalPrice > 0 ? (
          <GuestPaymentSummary booking={ctx.booking} locale={ctx.locale} />
        ) : (
          <GuestAppEmptyState
            title={t("empty.payment.title")}
            description={t("empty.payment.description")}
            action={<GuestEmptyReceptionAction phone={receptionPhone} />}
          />
        )
      ) : null}
    </div>
  );
}
