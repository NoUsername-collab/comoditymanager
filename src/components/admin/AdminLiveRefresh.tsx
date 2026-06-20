"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

/** Soft background refresh — pauses when tab is hidden. */
const REFRESH_MS = 3 * 60 * 1000;

export function AdminLiveRefresh() {
  const tCommon = useTranslations("admin.common");
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const clearTimer = () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };

    const startTimer = () => {
      clearTimer();
      timerRef.current = setInterval(() => {
        if (document.visibilityState === "visible") {
          router.refresh();
        }
      }, REFRESH_MS);
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        startTimer();
      } else {
        clearTimer();
      }
    };

    if (document.visibilityState === "visible") {
      startTimer();
    }
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      clearTimer();
    };
  }, [router]);

  return (
    <div className="admin-hud__sync" title={tCommon("autoRefreshTitle")}>
      <span className="admin-hud__sync-dot" aria-hidden />
      <span>{tCommon("auto3m")}</span>
    </div>
  );
}
