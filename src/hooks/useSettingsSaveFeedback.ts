"use client";

import { useCallback, useRef } from "react";
import { useAdminFx } from "@/components/admin/feedback/AdminToastProvider";

const SUCCESS_TOAST_COOLDOWN_MS = 2500;

export function settingsPartialChanged<T extends object>(
  current: T,
  partial: Partial<T>
): boolean {
  return (Object.keys(partial) as (keyof T)[]).some((key) => {
    const next = partial[key];
    const prev = current[key];
    if (Array.isArray(next) || Array.isArray(prev)) {
      return JSON.stringify(next) !== JSON.stringify(prev);
    }
    return prev !== next;
  });
}

export function useSettingsSaveFeedback() {
  const { showToast } = useAdminFx();
  const lastSuccessToastAt = useRef(0);

  const notifySuccess = useCallback(
    (title: string) => {
      const now = Date.now();
      if (now - lastSuccessToastAt.current < SUCCESS_TOAST_COOLDOWN_MS) return;
      lastSuccessToastAt.current = now;
      showToast({ kind: "success", title });
    },
    [showToast]
  );

  const notifyError = useCallback(
    (title: string, message?: string) => {
      showToast({ kind: "error", title, message });
    },
    [showToast]
  );

  return { notifySuccess, notifyError };
}
