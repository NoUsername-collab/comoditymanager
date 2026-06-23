import { GuestAppHomeScreen } from "@/features/guest-app/GuestAppHomeScreen";
import { resolveGuestAccessByCode } from "@/services/guest-app/access";
import { resolveGuestAppContext } from "@/services/guest-app/resolve-context";
import { getPensionSettings } from "@/services/pension-settings";
import { getEffectiveToday } from "@/domain/simulation/sim-clock";
import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

export default async function GuestStayHomePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const [{ code }, locale, today, pensionSettings, tMeta, session] = await Promise.all([
    params,
    getLocale(),
    getEffectiveToday(),
    getPensionSettings().catch(() => null),
    getTranslations("guestApp.meta"),
    params.then((p) =>
      resolveGuestAccessByCode(p.code).catch(() => ({
        ok: false as const,
        reason: "not_found" as const,
      }))
    ),
  ]);
  const pensionName = pensionSettings?.display_name ?? tMeta("fallbackName");
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
      pensionName={pensionName}
      today={today}
    />
  );
}
