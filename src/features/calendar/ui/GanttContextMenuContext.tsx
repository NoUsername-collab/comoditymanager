"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  GanttContextMenuTarget,
  GanttCreateDraftRequest,
} from "@/domain/gantt/context-menu";
import type { GanttOccDetail } from "@/features/calendar/ui/GanttOccupancyDetailPanel";
import type { MoveRoomDraft } from "@/features/calendar/ui/MoveRoomDialog";

export type GanttContextMenuActions = {
  openMenu: (target: GanttContextMenuTarget) => void;
  closeMenu: () => void;
  menu: GanttContextMenuTarget | null;
  requestCreate: (draft: GanttCreateDraftRequest) => void;
  openMoveRoom: (draft: MoveRoomDraft) => void;
  openOccDetail: (detail: GanttOccDetail) => void;
};

const Ctx = createContext<GanttContextMenuActions | null>(null);

export function GanttContextMenuProvider({
  children,
  onRequestCreate,
  onOpenMoveRoom,
  onOpenOccDetail,
}: {
  children: ReactNode;
  onRequestCreate: (draft: GanttCreateDraftRequest) => void;
  onOpenMoveRoom: (draft: MoveRoomDraft) => void;
  onOpenOccDetail: (detail: GanttOccDetail) => void;
}) {
  const [menu, setMenu] = useState<GanttContextMenuTarget | null>(null);

  const closeMenu = useCallback(() => setMenu(null), []);
  const openMenu = useCallback((target: GanttContextMenuTarget) => {
    setMenu(target);
  }, []);

  const requestCreate = useCallback(
    (draft: GanttCreateDraftRequest) => {
      closeMenu();
      onRequestCreate(draft);
    },
    [closeMenu, onRequestCreate]
  );

  const openMoveRoom = useCallback(
    (draft: MoveRoomDraft) => {
      closeMenu();
      onOpenMoveRoom(draft);
    },
    [closeMenu, onOpenMoveRoom]
  );

  const openOccDetail = useCallback(
    (detail: GanttOccDetail) => {
      closeMenu();
      onOpenOccDetail(detail);
    },
    [closeMenu, onOpenOccDetail]
  );

  const value = useMemo(
    () => ({
      menu,
      openMenu,
      closeMenu,
      requestCreate,
      openMoveRoom,
      openOccDetail,
    }),
    [menu, openMenu, closeMenu, requestCreate, openMoveRoom, openOccDetail]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useGanttContextMenu(): GanttContextMenuActions {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error("useGanttContextMenu must be used within GanttContextMenuProvider");
  }
  return ctx;
}
