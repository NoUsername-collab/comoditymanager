import { getTranslations } from "next-intl/server";
import { GuestAppPageSkeleton } from "@/features/guest-app/GuestAppPageSkeleton";

export default async function GuestFeatureLoading() {
  const t = await getTranslations("guestApp.shell");
  return <GuestAppPageSkeleton label={t("loading")} variant="feature" />;
}
