const ROOM_ROW_SELECTOR = "[data-gantt-room-row]";
let activeDropTargetId: string | null = null;
let activeDragSpanIds = new Set<string>();

type GanttRoomDragPreview = {
  leftPct: number;
  widthPct: number;
  hasConflict: boolean;
};

function roomRowSelector(roomId: string): string {
  const escaped =
    typeof CSS !== "undefined" && typeof CSS.escape === "function"
      ? CSS.escape(roomId)
      : roomId.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `${ROOM_ROW_SELECTOR}[data-gantt-room-row="${escaped}"]`;
}

function getRoomRow(roomId: string): HTMLElement | null {
  if (typeof document === "undefined") return null;
  return document.querySelector(roomRowSelector(roomId)) as HTMLElement | null;
}

export function findGanttRoomAtPoint(clientX: number, clientY: number): string | null {
  if (typeof document === "undefined") return null;
  const els = document.elementsFromPoint(clientX, clientY);
  for (const el of els) {
    if (el instanceof HTMLElement) {
      const row = el.closest(ROOM_ROW_SELECTOR) as HTMLElement | null;
      if (row?.dataset.ganttRoomRow) {
        return row.dataset.ganttRoomRow;
      }
    }
  }
  return null;
}

export function listGanttRoomIdsInDomOrder(): string[] {
  if (typeof document === "undefined") return [];
  return Array.from(document.querySelectorAll<HTMLElement>(ROOM_ROW_SELECTOR))
    .map((node) => node.dataset.ganttRoomRow ?? "")
    .filter(Boolean);
}

export function setGanttRoomDropTarget(roomId: string | null): void {
  if (typeof document === "undefined") return;
  if (activeDropTargetId === roomId) return;

  if (activeDropTargetId) {
    getRoomRow(activeDropTargetId)?.classList.remove("gantt-room-row--drop-target");
  }
  if (roomId) {
    getRoomRow(roomId)?.classList.add("gantt-room-row--drop-target");
  }

  activeDropTargetId = roomId;
}

export function clearGanttRoomDropTargets(): void {
  setGanttRoomDropTarget(null);
}

export function setGanttRoomDragSpan(
  roomIds: string[],
  preview?: GanttRoomDragPreview
): void {
  if (typeof document === "undefined") return;
  const nextIds = new Set(roomIds);
  const touchedIds = new Set([...activeDragSpanIds, ...nextIds]);

  for (const roomId of touchedIds) {
    const node = getRoomRow(roomId);
    if (!node) continue;
    const active = nextIds.has(roomId);
    node.classList.toggle("gantt-room-row--drag-span", active);
    node.classList.toggle(
      "gantt-room-row--drag-span-conflict",
      active && !!preview?.hasConflict
    );
    if (active && preview) {
      node.style.setProperty("--gantt-drag-left", `${preview.leftPct}%`);
      node.style.setProperty("--gantt-drag-width", `${preview.widthPct}%`);
    } else {
      node.style.removeProperty("--gantt-drag-left");
      node.style.removeProperty("--gantt-drag-width");
    }
  }

  activeDragSpanIds = nextIds;
}

export function clearGanttRoomDragSpan(): void {
  setGanttRoomDragSpan([]);
}
