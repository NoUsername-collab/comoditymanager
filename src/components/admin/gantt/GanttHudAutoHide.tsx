"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AdminPortal } from "@/components/admin/overlay/AdminPortal";
import { useCompactLayoutHints } from "@/hooks/useMobileLayout";
import { useTranslations } from "next-intl";

const SHELL_CLASS = "admin-shell--gantt-hud-autohide";
const SHELL_RETRACTED_CLASS = "admin-shell--gantt-hud-retracted";
const HUD_RETRACTED_CLASS = "admin-hud--retracted";

function HudChevron({ up }: { up: boolean }) {
  return (
    <svg
      className="gantt-hud-toggle__icon"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
    >
      {up ? (
        <path
          d="M4 10.5 8 6.5 12 10.5"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <path
          d="M4 5.5 8 9.5 12 5.5"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

/**
 * Desktop Gantt only: collapse global admin HUD via arrow toggle;
 * calendar shifts up/down with the HUD spacer.
 */
export function GanttHudAutoHide() {
  const tGantt = useTranslations("admin.gantt");
  const { compactChrome } = useCompactLayoutHints();
  const [retracted, setRetracted] = useState(false);
  const [hudHeight, setHudHeight] = useState(40);
  const hudRef = useRef<HTMLElement | null>(null);
  const shellRef = useRef<HTMLElement | null>(null);

  const applyRetracted = useCallback((next: boolean) => {
    setRetracted(next);
    shellRef.current?.classList.toggle(SHELL_RETRACTED_CLASS, next);
    hudRef.current?.classList.toggle(HUD_RETRACTED_CLASS, next);
  }, []);

  const toggleHud = useCallback(() => {
    applyRetracted(!retracted);
  }, [applyRetracted, retracted]);

  useEffect(() => {
    if (compactChrome) return;

    const hud = document.querySelector<HTMLElement>(".admin-shell > .admin-hud");
    const shell = hud?.closest<HTMLElement>(".admin-shell");
    if (!hud || !shell) return;

    hudRef.current = hud;
    shellRef.current = shell;
    shell.classList.add(SHELL_CLASS);

    const syncHudHeight = () => {
      const height = hud.offsetHeight;
      setHudHeight(height);
      shell.style.setProperty("--gantt-hud-height", `${height}px`);
      document.documentElement.style.setProperty("--gantt-hud-height", `${height}px`);
    };

    syncHudHeight();
    const resizeObserver = new ResizeObserver(syncHudHeight);
    resizeObserver.observe(hud);

    return () => {
      resizeObserver.disconnect();
      hud.classList.remove(HUD_RETRACTED_CLASS);
      shell.classList.remove(SHELL_CLASS, SHELL_RETRACTED_CLASS);
      shell.style.removeProperty("--gantt-hud-height");
      document.documentElement.style.removeProperty("--gantt-hud-height");
      hudRef.current = null;
      shellRef.current = null;
    };
  }, [compactChrome]);

  if (compactChrome) return null;

  const toggleTop = retracted ? 0 : Math.max(0, hudHeight - 11);

  return (
    <AdminPortal>
      <button
        type="button"
        className={[
          "gantt-hud-toggle",
          retracted ? "gantt-hud-toggle--retracted" : "gantt-hud-toggle--expanded",
        ].join(" ")}
        style={{ top: toggleTop }}
        onClick={toggleHud}
        aria-expanded={!retracted}
        aria-label={retracted ? tGantt("hudShow") : tGantt("hudHide")}
        title={retracted ? tGantt("hudShow") : tGantt("hudHide")}
      >
        <HudChevron up={!retracted} />
      </button>
    </AdminPortal>
  );
}
