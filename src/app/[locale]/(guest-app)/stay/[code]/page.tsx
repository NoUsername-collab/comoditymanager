import { GuestAppHomeScreen } from "@/features/guest-app/GuestAppHomeScreen";
import { visibleGuestAppFeaturesForBooking } from "@/features/guest-app/feature-labels";
import { resolveGuestAccessByCode } from "@/services/guest-app/access";
import { resolveGuestAppContext } from "@/services/guest-app/resolve-context";
import { getEffectiveToday } from "@/domain/simulation/sim-clock";
import { getLocale } from "next-intl/server";
import { notFound } from "next/navigation";

export default async function GuestStayHomePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const [{ code }, locale, today] = await Promise.all([
    params,
    getLocale(),
    getEffectiveToday(),
  ]);
  const session = await resolveGuestAccessByCode(code).catch(() => ({
    ok: false as const,
    reason: "not_found" as const,
  }));
  if (!session.ok) notFound();

  const ctx = await resolveGuestAppContext(
    session.settings,
    session.booking,
    locale,
  );

  return (
    <GuestAppHomeScreen
      accessCode={session.accessCode}
      ctx={ctx}
      today={today}
    />
  );
}
