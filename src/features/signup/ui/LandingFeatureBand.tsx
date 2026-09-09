import type { ReactNode } from "react";

type Align = "copy-first" | "visual-first";

export function LandingFeatureBand({
  align,
  ink = false,
  eyebrow,
  title,
  description,
  items,
  children,
}: {
  align: Align;
  ink?: boolean;
  eyebrow?: string;
  title: string;
  description: string;
  items?: string[];
  children?: ReactNode;
}) {
  const hasVisual = Boolean(children);
  const innerMod = !hasVisual
    ? "lp-feat-section__inner--copy-only"
    : align === "copy-first"
      ? "lp-feat-section__inner--left"
      : "lp-feat-section__inner--right";

  const copy = (
    <div className="lp-feat-section__copy">
      {eyebrow ? (
        <span className="lp-badge lp-badge--violet">{eyebrow}</span>
      ) : null}
      <h2 className="lp-feat-section__title">{title}</h2>
      <p className="lp-feat-section__desc">{description}</p>
      {items && items.length > 0 ? (
        <ul className={`lp-feat-list${ink ? " lp-feat-list--dark" : ""}`}>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );

  const visual = hasVisual ? (
    <div className="lp-feat-section__visual">{children}</div>
  ) : null;

  return (
    <section className={`lp-feat-section${ink ? " lp-feat-section--dark" : ""}`}>
      <div className={`lp-feat-section__inner ${innerMod}`}>
        {align === "visual-first" && visual ? (
          <>
            {visual}
            {copy}
          </>
        ) : (
          <>
            {copy}
            {visual}
          </>
        )}
      </div>
    </section>
  );
}
