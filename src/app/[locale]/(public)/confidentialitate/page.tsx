import { PublicPageShell } from "@/components/public/PublicPageShell";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

export default async function ConfidentialitatePage() {
  const [t, tShell, tFooter] = await Promise.all([
    getTranslations("public.privacy"),
    getTranslations("public.shell"),
    getTranslations("public.footer"),
  ]);

  const rich = {
    email: (chunks: ReactNode) => (
      <a href={`mailto:${tFooter("contactEmail")}`}>{chunks}</a>
    ),
  };

  return (
    <PublicPageShell
      narrow
      backLabel={tShell("backHome")}
      eyebrow={tShell("legalEyebrow")}
      title={t("title")}
      lead={t("lead")}
    >
      <div className="public-prose">
        <p>{t("intro")}</p>
        <h2>{t("collectTitle")}</h2>
        <ul>
          <li>{t("collect1")}</li>
          <li>{t("collect2")}</li>
          <li>{t("collect3")}</li>
        </ul>
        <h2>{t("useTitle")}</h2>
        <p>{t("useBody")}</p>
        <h2>{t("legalTitle")}</h2>
        <p>{t("legalBody")}</p>
        <h2>{t("retentionTitle")}</h2>
        <p>{t("retentionBody")}</p>
        <h2>{t("rightsTitle")}</h2>
        <p>{t.rich("rightsBody", rich)}</p>
      </div>
    </PublicPageShell>
  );
}
