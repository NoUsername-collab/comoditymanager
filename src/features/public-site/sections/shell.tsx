import type { ReactNode } from "react";
import { pickOwnLocalized } from "@/features/public-site/domain/localized";
import type { LocalizedText } from "@/features/public-site/domain/types";

/** The operator's text in this language, or "". */
export function copy(value: LocalizedText | string | null | undefined, locale: string): string {
  return pickOwnLocalized(value, locale);
}

/** Every section's outer markup. */
export function SectionShell({
  id,
  className,
  children,
}: {
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className={["pub-section", className].filter(Boolean).join(" ")}>
      <div className="pub-section__inner">{children}</div>
    </section>
  );
}

export function SectionHead({ title, lead }: { title: string; lead: string }) {
  return (
    <>
      {title ? <h2 className="pub-section__title">{title}</h2> : null}
      {lead ? <p className="pub-section__lead">{lead}</p> : null}
    </>
  );
}
