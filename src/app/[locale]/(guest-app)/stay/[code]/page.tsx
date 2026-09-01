import { GuestAppHomeScreen } from "@/features/guest-app/GuestAppHomeScreen";
import { loadGuestStayHome } from "@/features/guest-app/loaders";
import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

export default async function GuestStayHomePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const [{ code }, locale, tMeta] = await Promise.all([
    params,
    getLocale(),
    getTranslations("guestApp.meta"),
  ]);
  const loaded = await loadGuestStayHome(code, locale);
  const pensionName = loaded.pensionSettings?.display_name ?? tMeta("fallbackName");
  if (!loaded.ok) notFound();

  return (
    <GuestAppHomeScreen
      accessCode={loaded.session.accessCode}
      ctx={loaded.ctx}
      pensionName={pensionName}
      today={loaded.today}
    />
  );
}
