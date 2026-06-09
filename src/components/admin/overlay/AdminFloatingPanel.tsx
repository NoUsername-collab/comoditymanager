"use client";

import { useEffect, useId, useRef } from "react";
import { useTranslations } from "next-intl";
import { getVisualViewportBox } from "@/lib/ui/viewport-position";
import { AdminPortal } from "./AdminPortal";
import { useFloatingPosition } from "./useFloatingPosition";

const FOCUSABLE =
  'a[href], button:not([disabled]), select, textarea, input:not([type="hidden"]), [tabindex]:not([tabindex="-1"])';

function getFocusableElements(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.hasAttribute("hidden") && el.tabIndex !== -1
  );
}

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
  const tCommon = useTranslations("admin.common");
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const panelStyle = useFloatingPosition(open, anchorRect ?? null, width, variant);

  useEffect(() => {
    if (!open || variant !== "modal") return;

    document.documentElement.classList.add("admin-modal-open");

    return () => {
      document.documentElement.classList.remove("admin-modal-open");
    };
  }, [open, variant]);

  useEffect(() => {
    if (!open || variant !== "modal") return;

    const panel = panelRef.current;
    if (!panel) return;

    const focusFirst = () => {
      const closeBtn = panel.querySelector<HTMLElement>(".admin-floating-panel__close");
      const items = getFocusableElements(panel);
      (closeBtn ?? items[0])?.focus();
    };

    const raf = requestAnimationFrame(focusFirst);

    const onKey = (e: KeyboardEvent) => {
      if (closeOnEscape && e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key !== "Tab") return;

      const items = getFocusableElements(panel);
      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKey);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, variant, closeOnEscape, onClose]);

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
            aria-label={tCommon("close")}
            onClick={onClose}
          />
        )}
        <div
          ref={panelRef}
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
              ? {
                  width: Math.min(width, getVisualViewportBox().width - 32 || width),
                }
              : { ...panelStyle, width }
          }
          onPointerDown={(e) => e.stopPropagation()}
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
                aria-label={tCommon("close")}
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
