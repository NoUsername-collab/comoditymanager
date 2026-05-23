import Link from "next/link";
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

export function PublicPageShell({
  backHref = "/",
  backLabel = "Acasă",
  eyebrow,
  title,
  lead,
  wide,
  narrow,
  children,
}: Props) {
  return (
    <main className="public-page">
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
            ← {backLabel}
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
