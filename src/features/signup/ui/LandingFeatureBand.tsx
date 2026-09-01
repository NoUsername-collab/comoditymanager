import { Link } from "@/i18n/navigation";
import type { ReactNode } from "react";

type Align = "copy-first" | "visual-first";

export function LandingFeatureBand({
  align,
  ink = false,
  eyebrow,
  title,
  description,
  items,
  ctaHref,
  ctaLabel,
  children,
}: {
  align: Align;
  ink?: boolean;
  eyebrow: string;
  title: string;
  description: string;
  items: string[];
  ctaHref: string;
  ctaLabel: string;
  children: ReactNode;
}) {
  const innerMod =
    align === "copy-first"
      ? "lp-feat-section__inner--left"
      : "lp-feat-section__inner--right";

  const copy = (
    <div className="lp-feat-section__copy">
      <span className="lp-badge lp-badge--violet">{eyebrow}</span>
      <h2 className="lp-feat-section__title">{title}</h2>
      <p className="lp-feat-section__desc">{description}</p>
      <ul className={`lp-feat-list${ink ? " lp-feat-list--dark" : ""}`}>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <Link href={ctaHref} className="lp-btn lp-btn--primary">
        {ctaLabel}
      </Link>
    </div>
  );

  const visual = (
    <div className="lp-feat-section__visual">{children}</div>
  );

  return (
    <section className={`lp-feat-section${ink ? " lp-feat-section--dark" : ""}`}>
      <div className={`lp-feat-section__inner ${innerMod}`}>
        {align === "copy-first" ? (
          <>
            {copy}
            {visual}
          </>
        ) : (
          <>
            {visual}
            {copy}
          </>
        )}
      </div>
    </section>
  );
}
