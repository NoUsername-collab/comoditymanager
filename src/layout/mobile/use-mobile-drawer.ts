"use client";

import { useEffect, type RefObject } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), select, textarea, input:not([type="hidden"]), [tabindex]:not([tabindex="-1"])';

function getFocusableElements(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.hasAttribute("hidden") && el.tabIndex !== -1
  );
}

/** Prefer nav links over header close on open; trap still spans full panel. */
function getInitialFocusTarget(panel: HTMLElement): HTMLElement | undefined {
  const nav = panel.querySelector<HTMLElement>(".ml-drawer__nav");
  if (nav) {
    const navItems = getFocusableElements(nav);
    if (navItems.length > 0) return navItems[0];
  }
  return getFocusableElements(panel)[0];
}

type UseMobileDrawerOptions = {
  open: boolean;
  onClose: () => void;
  panelRef: RefObject<HTMLElement | null>;
  triggerRef?: RefObject<HTMLElement | null>;
};

/** Focus trap + Escape + scroll lock for mobile drawer dialogs. */
export function useMobileDrawer({
  open,
  onClose,
  panelRef,
  triggerRef,
}: UseMobileDrawerOptions): void {
  useEffect(() => {
    if (!open) return;

    const panel = panelRef.current;
    if (!panel) return;

    const focusFirst = () => {
      getInitialFocusTarget(panel)?.focus();
    };

    const raf = requestAnimationFrame(focusFirst);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        triggerRef?.current?.focus();
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

    document.addEventListener("keydown", onKey);
    document.documentElement.classList.add("ml-drawer-open");

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKey);
      document.documentElement.classList.remove("ml-drawer-open");
    };
  }, [open, onClose, panelRef, triggerRef]);
}
