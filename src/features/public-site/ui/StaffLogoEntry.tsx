"use client";

import { useRef, type MouseEvent, type ReactNode } from "react";
import { useRouter } from "@/i18n/navigation";

/** Window to detect double-click before single-click navigation runs. */
const DOUBLE_CLICK_MS = 350;

/**
 * Hidden staff entry: double-click logo/title → admin login.
 * Single click goes home (delayed slightly so double-click is reliable).
 */
export function StaffLogoEntry({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const router = useRouter();
  const pendingHomeRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastClickRef = useRef(0);

  function clearPendingHome() {
    if (pendingHomeRef.current) {
      clearTimeout(pendingHomeRef.current);
      pendingHomeRef.current = null;
    }
  }

  function goLogin(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    clearPendingHome();
    lastClickRef.current = 0;
    router.push("/admin/login?next=/receptie");
  }

  function scheduleHome() {
    clearPendingHome();
    pendingHomeRef.current = setTimeout(() => {
      pendingHomeRef.current = null;
      lastClickRef.current = 0;
      router.push("/");
    }, DOUBLE_CLICK_MS);
  }

  function handleClick(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    const now = Date.now();
    const withinDouble =
      lastClickRef.current > 0 && now - lastClickRef.current < DOUBLE_CLICK_MS;

    if (withinDouble || e.detail >= 2) {
      goLogin(e);
      return;
    }

    lastClickRef.current = now;
    scheduleHome();
  }

  return (
    <div
      role="link"
      tabIndex={0}
      className={className}
      onClick={handleClick}
      onDoubleClick={goLogin}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          router.push("/");
        }
      }}
    >
      {children}
    </div>
  );
}
