import type { ReactNode } from "react";

/** Cadru fereastră XP Luna — conținutul copiilor devine client Win98 via CSS */
export function RetroXpWindow({
  title,
  children,
  className = "",
  bodyClassName = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={["admin-xp-window", className].filter(Boolean).join(" ")}>
      <div className="admin-xp-window__titlebar" aria-hidden>
        <span className="admin-xp-window__titlebar-text">{title}</span>
        <span className="admin-xp-window__controls">
          <span className="admin-xp-window__ctrl admin-xp-window__ctrl--min" title="Minimizează" />
          <span className="admin-xp-window__ctrl admin-xp-window__ctrl--max" title="Maximizează" />
          <span className="admin-xp-window__ctrl admin-xp-window__ctrl--close" title="Închide" />
        </span>
      </div>
      <div className={["admin-win98-body", bodyClassName].filter(Boolean).join(" ")}>
        {children}
      </div>
    </section>
  );
}
