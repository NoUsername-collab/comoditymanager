import { PublicPageShell } from "@/components/public/PublicPageShell";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

export default async function TermeniPage() {
  const [t, tShell, tFooter] = await Promise.all([
    getTranslations("public.terms"),
    getTranslations("public.shell"),
    getTranslations("public.footer"),
  ]);

  const rich = {
    strong: (chunks: ReactNode) => <strong>{chunks}</strong>,
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
        <h2>{t("s1Title")}</h2>
        <p>{t.rich("s1Body", rich)}</p>
        <h2>{t("s2Title")}</h2>
        <p>{t("s2Body")}</p>
        <h2>{t("s3Title")}</h2>
        <p>{t("s3Body")}</p>
        <h2>{t("s4Title")}</h2>
        <p>{t.rich("s4Body", rich)}</p>
      </div>
    </PublicPageShell>
  );
}
