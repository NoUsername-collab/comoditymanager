import type { GuestAppResolvedContext } from "@/services/guest-app/resolve-context";
import { buildGuestStayMilestones } from "@/domain/guest-app/stay-milestone";
import { visibleGuestAppFeaturesForBooking } from "@/features/guest-app/feature-labels";
import { GuestAppQuickActions } from "@/features/guest-app/GuestAppQuickActions";
import { GuestFeatureLink } from "@/features/guest-app/GuestFeatureLink";
import { GuestHomePrimaryCta } from "@/features/guest-app/GuestHomePrimaryCta";
import { GuestInstallHint } from "@/features/guest-app/GuestInstallHint";
import { GuestShareStayButton } from "@/features/guest-app/GuestShareStayButton";
import { GuestStayMilestoneStrip } from "@/features/guest-app/GuestStayMilestoneStrip";
import { GuestStayPhaseBanner } from "@/features/guest-app/GuestStayPhaseBanner";
import { GuestFeedbackForm } from "@/features/guest-app/GuestFeedbackForm";
import { GuestTodayCards } from "@/features/guest-app/GuestTodayCards";
import { GuestWeatherWidget } from "@/features/guest-app/GuestWeatherWidget";
import { GuestWifiQrCode } from "@/features/guest-app/GuestWifiQrCode";
import { GuestWifiQuickCard } from "@/features/guest-app/GuestWifiQuickCard";
import { resolveGuestStayPhase } from "@/domain/guest-app/stay-milestone";
import { getWeatherCoordinates } from "@/services/weather-coordinates";
import { formatStayPeriod } from "@/lib/ro-calendar";
import { getTranslations } from "next-intl/server";

type Props = {
  accessCode: string;
  ctx: GuestAppResolvedContext;
  today: string;
};

export async function GuestAppHomeScreen({ accessCode, ctx, today }: Props) {
  const t = await getTranslations("guestApp");
  const { booking, settings, locale, hotel, wifi } = ctx;
  const features = visibleGuestAppFeaturesForBooking(settings, booking);
  const period = formatStayPeriod(
    booking.checkIn,
    booking.checkOut,
    locale,
    true,
  );
  const milestones = buildGuestStayMilestones({
    today,
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    checkedInAt: booking.checkedInAt,
  });
  const wifiFeature = features.find((feature) => feature.id === "wifi");
  const hasWifiCredentials = Boolean(wifi?.networkName || wifi?.password);
  const weatherCoords = await getWeatherCoordinates();

  return (
    <div className="space-y-6">
      <GuestStayMilestoneStrip steps={milestones} />

      <GuestStayPhaseBanner
        today={today}
        checkIn={booking.checkIn}
        checkOut={booking.checkOut}
        checkedInAt={booking.checkedInAt}
      />

      <section className="guest-app__hero">
        <p className="guest-app__hero__eyebrow">
          {t("home.welcome")}, {booking.guestName}
        </p>
        <h1 className="guest-app__hero__title">{period}</h1>
        {booking.roomLabels.length > 0 ? (
          <p className="guest-app__hero__rooms">{booking.roomLabels.join(" · ")}</p>
        ) : null}
        {hotel.shortDescription ? (
          <p className="guest-app__hero__desc">{hotel.shortDescription}</p>
        ) : null}
        <GuestAppQuickActions phone={hotel.phone} address={hotel.address} />
        <div className="guest-app__hero__actions">
          <GuestHomePrimaryCta
            accessCode={accessCode}
            today={today}
            checkIn={booking.checkIn}
            checkOut={booking.checkOut}
            checkedInAt={booking.checkedInAt}
            features={features}
            hasWifiCredentials={hasWifiCredentials}
          />
          <GuestShareStayButton />
        </div>
      </section>

      <GuestTodayCards
        accessCode={accessCode}
        today={today}
        checkIn={booking.checkIn}
        checkOut={booking.checkOut}
        checkedInAt={booking.checkedInAt}
        features={features}
        hasWifiCredentials={hasWifiCredentials}
      />

      <GuestInstallHint />

      {(() => {
        const phase = resolveGuestStayPhase({
          today,
          checkIn: booking.checkIn,
          checkOut: booking.checkOut,
          checkedInAt: booking.checkedInAt,
        });
        const showFeedback =
          phase === "checked_out" ||
          (phase === "checked_in" && today === booking.checkOut);
        return showFeedback ? (
          <section id="feedback">
            <h2 className="guest-app__section-title mb-3">
              {t("feedback.sectionTitle")}
            </h2>
            <GuestFeedbackForm
              accessCode={accessCode}
              alreadySubmitted={ctx.feedbackSubmitted}
            />
          </section>
        ) : null;
      })()}

      {wifiFeature && wifi && hasWifiCredentials ? (
        <>
          <GuestWifiQuickCard accessCode={accessCode} wifi={wifi} />
          {wifi.networkName ? (
            <GuestWifiQrCode
              networkName={wifi.networkName}
              password={wifi.password}
            />
          ) : null}
        </>
      ) : null}

      {weatherCoords ? (
        <GuestWeatherWidget lat={weatherCoords.lat} lng={weatherCoords.lng} />
      ) : null}

      <section id="features">
        <h2 className="guest-app__section-title mb-3">{t("home.sectionFeatures")}</h2>
        <ul className="guest-app__feature-list">
          {features.map((feature) => (
            <li key={feature.id}>
              <GuestFeatureLink accessCode={accessCode} feature={feature} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
