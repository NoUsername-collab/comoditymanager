import { GuestAppFeatureScreen } from "@/features/guest-app/GuestAppFeatureScreen";
import { parseGuestAppFeatureSlug } from "@/domain/guest-app/routes";
import { visibleGuestAppFeaturesForBooking } from "@/features/guest-app/feature-labels";
import { loadGuestStayFeature } from "@/features/guest-app/loaders";
import { getLocale } from "next-intl/server";
import { notFound } from "next/navigation";

export default async function GuestStayFeaturePage({
  params,
}: {
  params: Promise<{ code: string; feature: string }>;
}) {
  const [{ code, feature: featureSlug }, locale] = await Promise.all([
    params,
    getLocale(),
  ]);
  const featureId = parseGuestAppFeatureSlug(featureSlug);
  if (!featureId) notFound();

  const loaded = await loadGuestStayFeature(code, locale);
  if (!loaded.ok) notFound();

  const visible = visibleGuestAppFeaturesForBooking(
    loaded.session.settings,
    loaded.session.booking,
  );
  if (!visible.some((f) => f.id === featureId)) notFound();

  return (
    <GuestAppFeatureScreen
      featureId={featureId}
      accessCode={loaded.session.accessCode}
      today={loaded.today}
      ctx={loaded.ctx}
    />
  );
}
