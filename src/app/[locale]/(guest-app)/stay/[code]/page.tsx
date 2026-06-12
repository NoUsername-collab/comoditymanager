import { GuestAppHomeScreen } from "@/features/guest-app/GuestAppHomeScreen";
import { resolveGuestAccessByCode } from "@/services/guest-app/access";
import { getLocale } from "next-intl/server";
import { notFound } from "next/navigation";

export default async function GuestStayHomePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const [{ code }, locale] = await Promise.all([params, getLocale()]);
  const session = await resolveGuestAccessByCode(code).catch(() => ({
    ok: false as const,
    reason: "not_found" as const,
  }));
  if (!session.ok) notFound();

  return (
    <GuestAppHomeScreen
      accessCode={session.accessCode}
      booking={session.booking}
      settings={session.settings}
      locale={locale}
    />
  );
}
