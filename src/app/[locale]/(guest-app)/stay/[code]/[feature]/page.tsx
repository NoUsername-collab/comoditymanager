import { GuestAppFeatureScreen } from "@/features/guest-app/GuestAppFeatureScreen";
import { parseGuestAppFeatureSlug } from "@/domain/guest-app/routes";
import { visibleGuestAppFeatures } from "@/features/guest-app/feature-labels";
import { resolveGuestAccessByCode } from "@/services/guest-app/access";
import { notFound } from "next/navigation";

export default async function GuestStayFeaturePage({
  params,
}: {
  params: Promise<{ code: string; feature: string }>;
}) {
  const { code, feature: featureSlug } = await params;
  const featureId = parseGuestAppFeatureSlug(featureSlug);
  if (!featureId) notFound();

  const session = await resolveGuestAccessByCode(code);
  if (!session.ok) notFound();

  const visible = visibleGuestAppFeatures(session.settings.features);
  if (!visible.some((f) => f.id === featureId)) notFound();

  return (
    <GuestAppFeatureScreen
      featureId={featureId}
      accessCode={session.accessCode}
      settings={session.settings}
      booking={session.booking}
    />
  );
}
