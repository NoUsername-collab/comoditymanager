"use client";

import { useCallback, useRef } from "react";
import {
  LONG_PRESS_MS,
  LONG_PRESS_MOVE_PX,
} from "@/domain/gantt/context-menu";

export function useLongPressMenu(onLongPress: (e: PointerEvent) => void) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const originRef = useRef<{ x: number; y: number } | null>(null);
  const firedRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      firedRef.current = false;
      originRef.current = { x: e.clientX, y: e.clientY };
      clearTimer();
      timerRef.current = setTimeout(() => {
        firedRef.current = true;
        onLongPress(e.nativeEvent);
      }, LONG_PRESS_MS);
    },
    [clearTimer, onLongPress]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const origin = originRef.current;
      if (!origin || firedRef.current) return;
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

  const consumeLongPress = useCallback(() => firedRef.current, []);

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel: onPointerUp,
    consumeLongPress,
  };
}
