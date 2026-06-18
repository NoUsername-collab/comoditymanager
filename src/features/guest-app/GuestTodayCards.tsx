import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { GuestAppFeatureDef } from "@/domain/guest-app/types";
import { guestAppFeatureHref } from "@/domain/guest-app/routes";
import { resolveGuestStayPhase } from "@/domain/guest-app/stay-milestone";
import { GuestFeatureIcon } from "@/features/guest-app/icons";

type Props = {
  accessCode: string;
  today: string;
  checkIn: string;
  checkOut: string;
  checkedInAt: string | null;
  features: GuestAppFeatureDef[];
  hasWifiCredentials: boolean;
};

type TodayCard = {
  featureId: string;
  labelKey: string;
  descKey: string;
  href: string;
  accent: "teal" | "blue" | "amber" | "rose" | "emerald";
};

function featureVisible(features: GuestAppFeatureDef[], id: string) {
  return features.some((f) => f.id === id && f.state !== "hidden");
}

function buildTodayCards(props: Props): TodayCard[] {
  const { accessCode, today, checkIn, checkOut, checkedInAt, features, hasWifiCredentials } = props;
  const phase = resolveGuestStayPhase({ today, checkIn, checkOut, checkedInAt });
  const cards: TodayCard[] = [];

  if (phase === "confirmed" && today === checkIn) {
    if (featureVisible(features, "online_checkin")) {
      cards.push({
        featureId: "online_checkin",
        labelKey: "today.checkinNow",
        descKey: "today.checkinNowDesc",
        href: guestAppFeatureHref(accessCode, "online_checkin"),
        accent: "teal",
      });
    }
    if (hasWifiCredentials && featureVisible(features, "wifi")) {
      cards.push({
        featureId: "wifi",
        labelKey: "today.connectWifi",
        descKey: "today.connectWifiDesc",
        href: guestAppFeatureHref(accessCode, "wifi"),
        accent: "blue",
      });
    }
  } else if (phase === "confirmed") {
    if (featureVisible(features, "online_checkin")) {
      cards.push({
        featureId: "online_checkin",
        labelKey: "today.prepareCheckin",
        descKey: "today.prepareCheckinDesc",
        href: guestAppFeatureHref(accessCode, "online_checkin"),
        accent: "teal",
      });
    }
    if (featureVisible(features, "hotel_info")) {
      cards.push({
        featureId: "hotel_info",
        labelKey: "today.discoverPlace",
        descKey: "today.discoverPlaceDesc",
        href: guestAppFeatureHref(accessCode, "hotel_info"),
        accent: "blue",
      });
    }
  } else if (phase === "checked_in" && today === checkOut) {
    if (featureVisible(features, "online_payment")) {
      cards.push({
        featureId: "online_payment",
        labelKey: "today.payNow",
        descKey: "today.payNowDesc",
        href: guestAppFeatureHref(accessCode, "online_payment"),
        accent: "amber",
      });
    }
    if (featureVisible(features, "hotel_info")) {
      cards.push({
        featureId: "hotel_info",
        labelKey: "today.checkoutInfo",
        descKey: "today.checkoutInfoDesc",
        href: guestAppFeatureHref(accessCode, "hotel_info"),
        accent: "rose",
      });
    }
    cards.push({
      featureId: "feedback",
      labelKey: "today.leaveFeedback",
      descKey: "today.leaveFeedbackDesc",
      href: "#feedback",
      accent: "amber",
    });
  } else if (phase === "checked_in") {
    if (hasWifiCredentials && featureVisible(features, "wifi")) {
      cards.push({
        featureId: "wifi",
        labelKey: "today.connectWifi",
        descKey: "today.connectWifiDesc",
        href: guestAppFeatureHref(accessCode, "wifi"),
        accent: "blue",
      });
    }
    if (featureVisible(features, "travel_tips")) {
      cards.push({
        featureId: "travel_tips",
        labelKey: "today.exploreTips",
        descKey: "today.exploreTipsDesc",
        href: guestAppFeatureHref(accessCode, "travel_tips"),
        accent: "emerald",
      });
    }
    if (featureVisible(features, "services")) {
      cards.push({
        featureId: "services",
        labelKey: "today.requestService",
        descKey: "today.requestServiceDesc",
        href: guestAppFeatureHref(accessCode, "services"),
        accent: "amber",
      });
    }
    if (featureVisible(features, "green_stay")) {
      cards.push({
        featureId: "green_stay",
        labelKey: "today.goGreen",
        descKey: "today.goGreenDesc",
        href: guestAppFeatureHref(accessCode, "green_stay"),
        accent: "emerald",
      });
    }
  }

  return cards.slice(0, 3);
}

export async function GuestTodayCards(props: Props) {
  const t = await getTranslations("guestApp");
  const cards = buildTodayCards(props);

  if (cards.length === 0) return null;

  return (
    <section className="guest-today">
      <h2 className="guest-app__section-title mb-3">{t("today.sectionTitle")}</h2>
      <div className="guest-today__grid">
        {cards.map((card) => {
          const inner = (
            <>
              <span className="guest-today__card__icon" aria-hidden>
                <GuestFeatureIcon
                  id={card.featureId as Parameters<typeof GuestFeatureIcon>[0]["id"]}
                  className="h-5 w-5"
                />
              </span>
              <span className="guest-today__card__label">
                {t(card.labelKey as "today.sectionTitle")}
              </span>
              <span className="guest-today__card__desc">
                {t(card.descKey as "today.sectionTitle")}
              </span>
            </>
          );
          const cls = `guest-today__card guest-today__card--${card.accent}`;
          return card.href.startsWith("#") ? (
            <a key={card.featureId} href={card.href} className={cls}>
              {inner}
            </a>
          ) : (
            <Link key={card.featureId} href={card.href} className={cls}>
              {inner}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
