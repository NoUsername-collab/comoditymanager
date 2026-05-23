"use client";

import { useEffect, useId } from "react";
import { AdminPortal } from "./AdminPortal";
import { useFloatingPosition } from "./useFloatingPosition";

export type AdminFloatingVariant = "popover" | "modal";

type Props = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  variant?: AdminFloatingVariant;
  anchorRect?: DOMRect | null;
  width?: number;
  className?: string;
  /** Fundal semi-opac peste pagină — implicit la modal */
  showBackdrop?: boolean;
  /** Închide la Escape */
  closeOnEscape?: boolean;
  onPanelMouseEnter?: () => void;
  onPanelMouseLeave?: () => void;
};

export function AdminFloatingPanel({
  open,
  onClose,
  children,
  title,
  variant = "popover",
  anchorRect = null,
  width = 300,
  className = "",
  showBackdrop = variant === "modal",
  closeOnEscape = true,
  onPanelMouseEnter,
  onPanelMouseLeave,
}: Props) {
  const titleId = useId();
  const panelStyle = useFloatingPosition(open, anchorRect ?? null, width, variant);

  useEffect(() => {
    if (!open || !closeOnEscape) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, closeOnEscape, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    if (variant === "modal") document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, variant]);

  if (!open) return null;

  const isModal = variant === "modal";

  return (
    <AdminPortal>
      <div
        className="admin-overlay-stack"
        data-admin-overlay={variant}
        aria-hidden={false}
      >
        {showBackdrop && (
          <button
            type="button"
            className="admin-overlay-backdrop"
            aria-label="Închide"
            onClick={onClose}
          />
        )}
        <div
          role="dialog"
          aria-modal={isModal}
          aria-labelledby={title ? titleId : undefined}
          className={[
            "admin-floating-panel",
            isModal && "admin-floating-panel--modal",
            className,
          ]
            .filter(Boolean)
            .join(" ")}
          style={
            isModal
              ? { width: Math.min(width, window.innerWidth - 32) }
              : { ...panelStyle, width }
          }
          onClick={(e) => e.stopPropagation()}
          onMouseEnter={onPanelMouseEnter}
          onMouseLeave={onPanelMouseLeave}
        >
          {title && (
            <header className="admin-floating-panel__header">
              <h2 id={titleId} className="admin-floating-panel__title">
                {title}
              </h2>
              <button
                type="button"
                className="admin-floating-panel__close"
                onClick={onClose}
                aria-label="Închide"
              >
                ✕
              </button>
            </header>
          )}
          <div className="admin-floating-panel__body">{children}</div>
        </div>
      </div>
    </AdminPortal>
  );
}
