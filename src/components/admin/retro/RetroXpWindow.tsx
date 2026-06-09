import type { ReactNode } from "react";

/** Cadru fereastră XP Luna — conținutul copiilor devine client Win98 via CSS */
export function RetroXpWindow({
  title,
  children,
  className = "",
  bodyClassName = "",
  controlTitles,
}: {
  title: string;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  /** Optional — titlebar is decorative (aria-hidden). Pass from server via getTranslations. */
  controlTitles?: { minimize: string; maximize: string; close: string };
}) {
  const controls = controlTitles ?? { minimize: "", maximize: "", close: "" };
  return (
    <section className={["admin-xp-window", className].filter(Boolean).join(" ")}>
      <div className="admin-xp-window__titlebar" aria-hidden>
        <span className="admin-xp-window__titlebar-text">{title}</span>
        <span className="admin-xp-window__controls">
          <span
            className="admin-xp-window__ctrl admin-xp-window__ctrl--min"
            title={controls.minimize}
          />
          <span
            className="admin-xp-window__ctrl admin-xp-window__ctrl--max"
            title={controls.maximize}
          />
          <span
            className="admin-xp-window__ctrl admin-xp-window__ctrl--close"
            title={controls.close}
          />
        </span>
      </div>
      <div className={["admin-win98-body", bodyClassName].filter(Boolean).join(" ")}>
        {children}
      </div>
    </section>
  );
}
