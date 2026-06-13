import type { ReactNode } from "react";

type Props = {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  badge?: ReactNode;
};

/** Secțiune plată — fără accordion. */
export function SettingsSection({
  title,
  description,
  children,
  className = "",
  badge,
}: Props) {
  return (
    <section className={["settings-section", className].filter(Boolean).join(" ")}>
      <header className="settings-section__head">
        <div>
          <h2 className="settings-section__title">{title}</h2>
          {description ? <p className="settings-section__desc">{description}</p> : null}
        </div>
        {badge ? <div className="settings-section__badge">{badge}</div> : null}
      </header>
      <div className="settings-section__body">{children}</div>
    </section>
  );
}
