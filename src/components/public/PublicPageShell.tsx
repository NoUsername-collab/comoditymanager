import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

type Props = {
  backHref?: string;
  backLabel?: string;
  eyebrow?: string;
  title: string;
  lead?: string;
  wide?: boolean;
  narrow?: boolean;
  children: ReactNode;
};

export async function PublicPageShell({
  backHref = "/",
  backLabel,
  eyebrow,
  title,
  lead,
  wide,
  narrow,
  children,
}: Props) {
  const tCommon = await getTranslations("common");
  const resolvedBackLabel = backLabel ?? tCommon("back");

  return (
    <main className="public-page ml-content">
      <div
        className={[
          "public-page__inner",
          wide && "public-page__inner--wide",
          narrow && "public-page__inner--narrow",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {backHref && (
          <Link href={backHref} className="public-back-link">
            ← {resolvedBackLabel}
          </Link>
        )}
        <header className="public-page__head">
          {eyebrow && <p className="public-page__eyebrow">{eyebrow}</p>}
          <h1 className="public-page__title">{title}</h1>
          {lead && <p className="public-page__lead">{lead}</p>}
        </header>
        {children}
      </div>
    </main>
  );
}
