"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { HudIconGear } from "@/components/admin/AdminHudIcons";

/**
 * Gear dropdown — right-edge of admin top bar.
 * Contains: auto-refresh status, simulation trigger, site public link,
 * language switcher, and logout.
 * Children are rendered inside the dropdown panel.
 */
export function AdminGearMenu({ children }: { children: React.ReactNode }) {
  const t = useTranslations("admin.shell");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (wrapRef.current?.contains(e.target as Node)) return;
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

  return (
    <div className="admin-gear" ref={wrapRef}>
      <button
        type="button"
        className="admin-gear__trigger"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t("settings")}
        onClick={() => setOpen((v) => !v)}
      >
        <HudIconGear className="admin-gear__icon" />
      </button>

      {open && (
        <div className="admin-gear__dropdown" role="menu">
          {children}
        </div>
      )}
    </div>
  );
}
