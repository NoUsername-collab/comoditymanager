import { getTranslations } from "next-intl/server";
import { GuestAppPageSkeleton } from "@/features/guest-app/GuestAppPageSkeleton";

export default async function GuestStayLoading() {
  const t = await getTranslations("guestApp.shell");
  return <GuestAppPageSkeleton label={t("loading")} variant="home" />;
}
