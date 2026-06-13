import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import type { GuestAppFeatureDef } from "@/domain/guest-app/types";
import { guestAppFeatureHref } from "@/domain/guest-app/routes";
import {
  resolveGuestStayPhase,
} from "@/domain/guest-app/stay-milestone";

type Props = {
  accessCode: string;
  today: string;
  checkIn: string;
  checkOut: string;
  checkedInAt: string | null;
  features: GuestAppFeatureDef[];
  hasWifiCredentials: boolean;
};

function featureVisible(features: GuestAppFeatureDef[], id: GuestAppFeatureDef["id"]) {
  return features.some((feature) => feature.id === id && feature.state !== "hidden");
}

export async function GuestHomePrimaryCta({
  accessCode,
  today,
  checkIn,
  checkOut,
  checkedInAt,
  features,
  hasWifiCredentials,
}: Props) {
  const t = await getTranslations("guestApp.home");
  const phase = resolveGuestStayPhase({ today, checkIn, checkOut, checkedInAt });

  let href: string | null = null;
  let label: string | null = null;

  if (phase === "confirmed" && featureVisible(features, "online_checkin")) {
    href = guestAppFeatureHref(accessCode, "online_checkin");
    label =
      today === checkIn ? t("ctaCheckinToday") : t("ctaPrepareCheckin");
  } else if (
    hasWifiCredentials &&
    featureVisible(features, "wifi") &&
    phase !== "checked_out"
  ) {
    href = guestAppFeatureHref(accessCode, "wifi");
    label = t("ctaConnectWifi");
  } else if (phase === "checked_in" && featureVisible(features, "travel_tips")) {
    href = guestAppFeatureHref(accessCode, "travel_tips");
    label = t("ctaSeeTips");
  } else if (today === checkOut && featureVisible(features, "hotel_info")) {
    href = guestAppFeatureHref(accessCode, "hotel_info");
    label = t("ctaCheckoutInfo");
  }

  if (!href || !label) return null;

  return (
    <Link href={href} className="guest-app__primary-cta">
      {label}
    </Link>
  );
}
