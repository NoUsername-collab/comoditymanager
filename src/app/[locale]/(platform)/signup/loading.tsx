import { PublicFormSkeleton } from "@/components/public/PublicPageSkeleton";
import { getTranslations } from "next-intl/server";

export default async function SignupLoading() {
  const t = await getTranslations("common");
  return (
    <div aria-busy="true" aria-label={t("loading")}>
      <PublicFormSkeleton />
    </div>
  );
}
