"use client";

import { useCallback, useRef } from "react";
import {
  LONG_PRESS_MS,
  LONG_PRESS_MOVE_PX,
} from "@/domain/gantt/context-menu";

/** Click dreapta + long-press (~400ms) = același meniu contextual. */
export function useGanttMenuTrigger(
  onOpen: (clientX: number, clientY: number) => void
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const originRef = useRef<{ x: number; y: number } | null>(null);
  const openedRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const onContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onOpen(e.clientX, e.clientY);
    },
    [onOpen]
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      openedRef.current = false;
      originRef.current = { x: e.clientX, y: e.clientY };
      clearTimer();
      timerRef.current = setTimeout(() => {
        openedRef.current = true;
        onOpen(e.clientX, e.clientY);
      }, LONG_PRESS_MS);
    },
    [clearTimer, onOpen]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const origin = originRef.current;
      if (!origin || openedRef.current) return;
      const dx = e.clientX - origin.x;
      const dy = e.clientY - origin.y;
      if (Math.hypot(dx, dy) > LONG_PRESS_MOVE_PX) {
        clearTimer();
      }
    },
    [clearTimer]
  );

  const onPointerUp = useCallback(() => {
    clearTimer();
    originRef.current = null;
  }, [clearTimer]);

  const consumeLongPress = useCallback(() => openedRef.current, []);

  return {
    onContextMenu,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel: onPointerUp,
    consumeLongPress,
  };
}
