"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useTranslations } from "next-intl";
import { AdminPortal } from "@/components/admin/overlay/AdminPortal";
import {
  GanttStayPopover,
  type GanttStayPopoverData,
} from "@/features/calendar/ui/GanttStayPopover";

export type GanttStayTapPopoverPayload = {
  key: string;
  anchorRect: DOMRect;
  data: GanttStayPopoverData;
};

type GanttStayTapPopoverActions = {
  payload: GanttStayTapPopoverPayload | null;
  openTapPopover: (next: GanttStayTapPopoverPayload) => void;
  closeTapPopover: () => void;
  isTapOpen: (key: string) => boolean;
};

const Ctx = createContext<GanttStayTapPopoverActions | null>(null);

function GanttStayTapPopoverHost() {
  const t = useTranslations("admin.common");
  const { payload, closeTapPopover } = useGanttStayTapPopover();
  if (!payload) return null;

  return (
    <AdminPortal>
      <button
        type="button"
        className="gantt-stay-tap-popover-backdrop fixed inset-0 z-[189]"
        aria-label={t("closeMenu")}
        onClick={closeTapPopover}
      />
      <GanttStayPopover
        data={payload.data}
        anchorRect={payload.anchorRect}
        visible
        onMouseLeave={closeTapPopover}
      />
    </AdminPortal>
  );
}

export function GanttStayTapPopoverProvider({ children }: { children: ReactNode }) {
  const [payload, setPayload] = useState<GanttStayTapPopoverPayload | null>(null);

  const closeTapPopover = useCallback(() => setPayload(null), []);

  const openTapPopover = useCallback((next: GanttStayTapPopoverPayload) => {
    setPayload((prev) => (prev?.key === next.key ? null : next));
  }, []);

  const isTapOpen = useCallback(
    (key: string) => payload?.key === key,
    [payload]
  );

  useEffect(() => {
    if (!payload) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeTapPopover();
    };
    const onScroll = () => closeTapPopover();
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [payload, closeTapPopover]);

  const value = useMemo(
    () => ({
      payload,
      openTapPopover,
      closeTapPopover,
      isTapOpen,
    }),
    [payload, openTapPopover, closeTapPopover, isTapOpen]
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      <GanttStayTapPopoverHost />
    </Ctx.Provider>
  );
}

export function useGanttStayTapPopover(): GanttStayTapPopoverActions {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error(
      "useGanttStayTapPopover must be used within GanttStayTapPopoverProvider"
    );
  }
  return ctx;
}
