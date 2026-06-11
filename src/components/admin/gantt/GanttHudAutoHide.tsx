"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useCompactLayoutHints } from "@/hooks/useMobileLayout";

const HIDE_DELAY_MS = 5000;
const SHELL_CLASS = "admin-shell--gantt-hud-autohide";
const HUD_RETRACTED_CLASS = "admin-hud--retracted";

function isGearMenuOpen(): boolean {
  return Boolean(document.querySelector(".admin-gear__dropdown--portal"));
}

/**
 * Desktop Gantt only: global admin HUD slides up after idle hover,
 * reappears when the pointer enters the top reveal strip (~HUD height).
 */
export function GanttHudAutoHide() {
  const { compactChrome } = useCompactLayoutHints();
  const [retracted, setRetracted] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hudRef = useRef<HTMLElement | null>(null);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current !== null) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const scheduleHide = useCallback(() => {
    clearHideTimer();
    hideTimerRef.current = setTimeout(() => {
      if (isGearMenuOpen()) {
        scheduleHide();
        return;
      }
      setRetracted(true);
      hudRef.current?.classList.add(HUD_RETRACTED_CLASS);
    }, HIDE_DELAY_MS);
  }, [clearHideTimer]);

  const revealHud = useCallback(() => {
    clearHideTimer();
    setRetracted(false);
    hudRef.current?.classList.remove(HUD_RETRACTED_CLASS);
    requestAnimationFrame(() => {
      if (hudRef.current?.matches(":hover")) return;
      scheduleHide();
    });
  }, [clearHideTimer, scheduleHide]);

  useEffect(() => {
    if (compactChrome) return;

    const hud = document.querySelector<HTMLElement>(".admin-shell > .admin-hud");
    const shell = hud?.closest<HTMLElement>(".admin-shell");
    if (!hud || !shell) return;

    hudRef.current = hud;
    shell.classList.add(SHELL_CLASS);

    const syncHudHeight = () => {
      shell.style.setProperty("--gantt-hud-height", `${hud.offsetHeight}px`);
    };

    syncHudHeight();
    const resizeObserver = new ResizeObserver(syncHudHeight);
    resizeObserver.observe(hud);

    const onHudEnter = () => revealHud();
    const onHudLeave = () => scheduleHide();
    const onHudFocusIn = () => revealHud();
    const onHudFocusOut = (event: FocusEvent) => {
      const next = event.relatedTarget as Node | null;
      if (next && hud.contains(next)) return;
      if (next && isGearMenuOpen()) return;
      scheduleHide();
    };

    hud.addEventListener("mouseenter", onHudEnter);
    hud.addEventListener("mouseleave", onHudLeave);
    hud.addEventListener("focusin", onHudFocusIn);
    hud.addEventListener("focusout", onHudFocusOut);

    scheduleHide();

    return () => {
      clearHideTimer();
      resizeObserver.disconnect();
      hud.removeEventListener("mouseenter", onHudEnter);
      hud.removeEventListener("mouseleave", onHudLeave);
      hud.removeEventListener("focusin", onHudFocusIn);
      hud.removeEventListener("focusout", onHudFocusOut);
      hud.classList.remove(HUD_RETRACTED_CLASS);
      shell.classList.remove(SHELL_CLASS);
      shell.style.removeProperty("--gantt-hud-height");
      hudRef.current = null;
    };
  }, [compactChrome, clearHideTimer, revealHud, scheduleHide]);

  if (compactChrome || !retracted) return null;

  return (
    <div
      className="gantt-hud-reveal-trigger"
      aria-hidden
      onMouseEnter={revealHud}
      onFocus={revealHud}
    />
  );
}
