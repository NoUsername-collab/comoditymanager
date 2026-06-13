import { GuestAppFeatureScreen } from "@/features/guest-app/GuestAppFeatureScreen";
import { parseGuestAppFeatureSlug } from "@/domain/guest-app/routes";
import { visibleGuestAppFeaturesForBooking } from "@/features/guest-app/feature-labels";
import { resolveGuestAccessByCode } from "@/services/guest-app/access";
import { resolveGuestAppContext } from "@/services/guest-app/resolve-context";
import { getEffectiveToday } from "@/domain/simulation/sim-clock";
import { getLocale } from "next-intl/server";
import { notFound } from "next/navigation";

export default async function GuestStayFeaturePage({
  params,
}: {
  params: Promise<{ code: string; feature: string }>;
}) {
  const [{ code, feature: featureSlug }, locale, today] = await Promise.all([
    params,
    getLocale(),
    getEffectiveToday(),
  ]);
  const featureId = parseGuestAppFeatureSlug(featureSlug);
  if (!featureId) notFound();

  const session = await resolveGuestAccessByCode(code).catch(() => ({
    ok: false as const,
    reason: "not_found" as const,
  }));
  if (!session.ok) notFound();

  const visible = visibleGuestAppFeaturesForBooking(
    session.settings,
    session.booking,
  );
  if (!visible.some((f) => f.id === featureId)) notFound();

  const ctx = await resolveGuestAppContext(
    session.settings,
    session.booking,
    locale,
  );

  return (
    <GuestAppFeatureScreen
      featureId={featureId}
      accessCode={session.accessCode}
      today={today}
      ctx={ctx}
    />
  );
}
