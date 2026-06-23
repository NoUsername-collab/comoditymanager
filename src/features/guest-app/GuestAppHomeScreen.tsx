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
import { GuestFeedbackSection } from "@/features/guest-app/GuestFeedbackSection";
import { GuestTodayCards } from "@/features/guest-app/GuestTodayCards";
import { GuestWeatherSection } from "@/features/guest-app/GuestWeatherSection";
import { GuestAppEmptyState } from "@/features/guest-app/GuestAppEmptyState";
import { GuestEmptyReceptionAction } from "@/features/guest-app/GuestEmptyReceptionAction";
import { GuestWifiQuickCard } from "@/features/guest-app/GuestWifiQuickCard";
import {
  countStayNights,
  resolveGuestStayPhase,
} from "@/domain/guest-app/stay-milestone";
import { formatStayPeriod } from "@/lib/ro-calendar";
import { getTranslations } from "next-intl/server";

type Props = {
  accessCode: string;
  ctx: GuestAppResolvedContext;
  pensionName: string;
  today: string;
};

export async function GuestAppHomeScreen({
  accessCode,
  ctx,
  pensionName,
  today,
}: Props) {
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
  const nights = countStayNights(booking.checkIn, booking.checkOut);

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
        <h1 className="guest-app__hero__title">{pensionName}</h1>
        <p className="guest-app__hero__dates">{period}</p>
        <div className="guest-app__hero__meta">
          <span className="guest-app__hero__nights">
            {t("home.nightsCount", { count: nights })}
          </span>
          {booking.roomLabels.length > 0 ? (
            <span className="guest-app__hero__rooms">{booking.roomLabels.join(" · ")}</span>
          ) : null}
        </div>
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
            <GuestFeedbackSection
              accessCode={accessCode}
              alreadySubmitted={ctx.feedbackSubmitted}
            />
          </section>
        ) : null;
      })()}

      {wifiFeature && wifi && hasWifiCredentials ? (
        <GuestWifiQuickCard accessCode={accessCode} wifi={wifi} />
      ) : null}

      <GuestWeatherSection />

      <section id="features">
        <h2 className="guest-app__section-title mb-3">{t("home.sectionFeatures")}</h2>
        {features.length === 0 ? (
          <GuestAppEmptyState
            title={t("empty.features.title")}
            description={t("empty.features.description")}
            icon="✦"
            action={<GuestEmptyReceptionAction phone={hotel.phone} />}
          />
        ) : (
          <ul className="guest-app__feature-list">
            {features.map((feature) => (
              <li key={feature.id}>
                <GuestFeatureLink accessCode={accessCode} feature={feature} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
