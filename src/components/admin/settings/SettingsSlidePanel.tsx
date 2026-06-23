"use client";

import { useId, useState, type ReactNode } from "react";

type Props = {
  title: string;
  subtitle?: string;
  icon?: string;
  badge?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
};

export function SettingsSlidePanel({
  title,
  subtitle,
  icon,
  badge,
  defaultOpen = false,
  children,
  className = "",
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();
  const titleId = useId();

  return (
    <section
      className={[
        "admin-settings-panel",
        open && "admin-settings-panel--open",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-labelledby={titleId}
    >
      <button
        type="button"
        className="admin-settings-panel__trigger"
        aria-expanded={open}
        aria-controls={panelId}
        id={titleId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="admin-settings-panel__trigger-main">
          {icon && (
            <span className="admin-settings-panel__icon" aria-hidden>
              {icon}
            </span>
          )}
          <span className="min-w-0 text-left">
            <span className="admin-settings-panel__title">{title}</span>
            {subtitle && !open && (
              <span className="admin-settings-panel__subtitle">{subtitle}</span>
            )}
          </span>
        </span>
        <span className="admin-settings-panel__trigger-end">
          {badge}
          <span
            className={[
              "admin-settings-panel__chevron",
              open && "admin-settings-panel__chevron--open",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-hidden
          >
            ▾
          </span>
        </span>
      </button>

      <PanelBody id={panelId} open={open}>
        {children}
      </PanelBody>
    </section>
  );
}

function PanelBody({
  id,
  open,
  children,
}: {
  id: string;
  open: boolean;
  children: ReactNode;
}) {
  return (
    <div
      id={id}
      className={[
        "admin-settings-panel__body",
        open && "admin-settings-panel__body--open",
      ]
        .filter(Boolean)
        .join(" ")}
      hidden={!open}
    >
      <div className="admin-settings-panel__inner">{children}</div>
    </div>
  );
}
