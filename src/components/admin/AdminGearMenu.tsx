"use client";

import { useState, useEffect, useRef, useCallback, useLayoutEffect } from "react";
import { useTranslations } from "next-intl";
import { HudIconGear } from "@/components/admin/AdminHudIcons";
import { SetupIssueBadge } from "@/components/admin/setup-issues/SetupIssueBadge";
import { AdminPortal } from "@/components/admin/overlay/AdminPortal";
import { computeFixedDropdownPosition } from "@/lib/ui/viewport-position";
import { isLanguageSwitcherEventTarget } from "@/lib/i18n/language-switcher-dom";

type MenuPos = { top: number; left: number };

/** Rough size before first layout measure (~11.5rem min-width gear panel). */
const MENU_ESTIMATE = { width: 184, height: 220 };

/**
 * Gear dropdown — right-edge of admin top bar.
 * Portaled to document.body so it stays above sticky page chrome (Gantt header, etc.).
 */
type Props = {
  children: React.ReactNode;
  hasUnresolvedIssues?: boolean;
};

export function AdminGearMenu({ children, hasUnresolvedIssues = false }: Props) {
  const t = useTranslations("admin.shell");
  const tIssues = useTranslations("admin.setupIssues");
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<MenuPos | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const positionMenu = useCallback(() => {
    const trigger = triggerRef.current?.getBoundingClientRect();
    if (!trigger) return;

    const measured = menuRef.current?.getBoundingClientRect();
    const menuSize = measured
      ? { width: measured.width, height: measured.height }
      : MENU_ESTIMATE;

    const pos = computeFixedDropdownPosition(trigger, menuSize, { gap: 6 });
    setMenuPos((prev) =>
      prev && prev.top === pos.top && prev.left === pos.left ? prev : pos
    );
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    positionMenu();
  }, [open, positionMenu]);

  useEffect(() => {
    if (!open) return;
    positionMenu();
    const onLayout = () => positionMenu();
    window.addEventListener("resize", onLayout);
    window.addEventListener("scroll", onLayout, true);
    window.visualViewport?.addEventListener("resize", onLayout);
    window.visualViewport?.addEventListener("scroll", onLayout);
    return () => {
      window.removeEventListener("resize", onLayout);
      window.removeEventListener("scroll", onLayout, true);
      window.visualViewport?.removeEventListener("resize", onLayout);
      window.visualViewport?.removeEventListener("scroll", onLayout);
    };
  }, [open, positionMenu]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      if (isLanguageSwitcherEventTarget(e.target)) return;
      setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const menu =
    open && menuPos ? (
      <div
        ref={menuRef}
        className="admin-gear__dropdown admin-gear__dropdown--portal"
        role="menu"
        style={{ top: menuPos.top, left: menuPos.left }}
      >
        {children}
      </div>
    ) : null;

  return (
    <div className="admin-gear">
      <button
        ref={triggerRef}
        type="button"
        className="admin-gear__trigger"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={
          hasUnresolvedIssues ? tIssues("gearAriaLabel") : t("settings")
        }
        onClick={() => setOpen((v) => !v)}
      >
        <HudIconGear className="admin-gear__icon" />
        {hasUnresolvedIssues ? (
          <SetupIssueBadge className="admin-gear__issue-badge" />
        ) : null}
      </button>

      {menu ? <AdminPortal>{menu}</AdminPortal> : null}
    </div>
  );
}
