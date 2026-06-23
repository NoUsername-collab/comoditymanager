import type { ReactNode } from "react";
import { SettingsPreviewLink } from "@/components/admin/settings/SettingsPreviewLink";

type Props = {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  badge?: ReactNode;
  previewHref?: string;
  previewLabel?: string;
  previewExternal?: boolean;
  collapsible?: boolean;
  defaultOpen?: boolean;
};

/** Grouped settings surface — collapsible on compact layout. */
export function SettingsSection({
  title,
  description,
  children,
  className = "",
  badge,
  previewHref,
  previewLabel,
  previewExternal = false,
  collapsible = true,
  defaultOpen = true,
}: Props) {
  const head = (
    <>
      <div className="settings-section__head-text">
        <h2 className="settings-section__title">{title}</h2>
        {description ? <p className="settings-section__desc">{description}</p> : null}
      </div>
      <div className="settings-section__head-actions">
        {previewHref && previewLabel ? (
          <SettingsPreviewLink
            href={previewHref}
            label={previewLabel}
            external={previewExternal}
          />
        ) : null}
        {badge ? <div className="settings-section__badge">{badge}</div> : null}
      </div>
    </>
  );

  if (!collapsible) {
    return (
      <section className={["settings-section", className].filter(Boolean).join(" ")}>
        <header className="settings-section__head">{head}</header>
        <div className="settings-section__body">{children}</div>
      </section>
    );
  }

  return (
    <section
      className={[
        "settings-section",
        "settings-section--collapsible",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <details className="settings-section__details" open={defaultOpen}>
        <summary className="settings-section__head">{head}</summary>
        <div className="settings-section__body">{children}</div>
      </details>
    </section>
  );
}
