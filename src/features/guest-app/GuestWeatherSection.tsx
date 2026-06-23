import { Suspense } from "react";
import { GuestWeatherSkeleton } from "@/features/guest-app/GuestWeatherSkeleton";
import { GuestWeatherWidget } from "@/features/guest-app/GuestWeatherWidget";
import { getWeatherCoordinates } from "@/services/weather-coordinates";
import { getTranslations } from "next-intl/server";

async function GuestWeatherLoader() {
  const coords = await getWeatherCoordinates();
  if (!coords) return null;
  return <GuestWeatherWidget lat={coords.lat} lng={coords.lng} />;
}

export async function GuestWeatherSection() {
  const t = await getTranslations("guestApp.shell");

  return (
    <Suspense fallback={<GuestWeatherSkeleton ariaLabel={t("loading")} />}>
      <GuestWeatherLoader />
    </Suspense>
  );
}
