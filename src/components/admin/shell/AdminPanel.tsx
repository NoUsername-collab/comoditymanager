import type { ReactNode } from "react";

/** Panou secțiune admin — titlul e opțional (ascuns în tema default). */
export function AdminPanel({
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
  /** Opțional — bara de titlu e decorativă (aria-hidden). */
  controlTitles?: { minimize: string; maximize: string; close: string };
}) {
  const controls = controlTitles ?? { minimize: "", maximize: "", close: "" };
  return (
    <section className={["admin-panel", className].filter(Boolean).join(" ")}>
      <div className="admin-panel__titlebar" aria-hidden>
        <span className="admin-panel__titlebar-text">{title}</span>
        <span className="admin-panel__controls">
          <span
            className="admin-panel__ctrl admin-panel__ctrl--min"
            title={controls.minimize}
          />
          <span
            className="admin-panel__ctrl admin-panel__ctrl--max"
            title={controls.maximize}
          />
          <span
            className="admin-panel__ctrl admin-panel__ctrl--close"
            title={controls.close}
          />
        </span>
      </div>
      <div className={["admin-panel-body", bodyClassName].filter(Boolean).join(" ")}>
        {children}
      </div>
    </section>
  );
}
