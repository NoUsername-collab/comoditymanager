import { LocaleFlagSpinner } from "@/components/ui/LocaleFlagSpinner";
import { getTranslations } from "next-intl/server";

export default async function PlatformLoading() {
  const t = await getTranslations("admin.common");

  return (
    <div className="platform-route-loading" role="status" aria-live="polite">
      <LocaleFlagSpinner label={t("loading")} size="lg" />
    </div>
  );
}
