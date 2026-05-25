const ROOM_ROW_SELECTOR = "[data-gantt-room-row]";

type GanttRoomDragPreview = {
  leftPct: number;
  widthPct: number;
  hasConflict: boolean;
};

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

export function setGanttRoomDropTarget(roomId: string | null): void {
  if (typeof document === "undefined") return;
  document.querySelectorAll(ROOM_ROW_SELECTOR).forEach((el) => {
    el.classList.toggle(
      "gantt-room-row--drop-target",
      roomId != null && (el as HTMLElement).dataset.ganttRoomRow === roomId
    );
  });
}

export function clearGanttRoomDropTargets(): void {
  setGanttRoomDropTarget(null);
}

export function setGanttRoomDragSpan(
  roomIds: string[],
  preview?: GanttRoomDragPreview
): void {
  if (typeof document === "undefined") return;
  const set = new Set(roomIds);
  document.querySelectorAll(ROOM_ROW_SELECTOR).forEach((el) => {
    const id = (el as HTMLElement).dataset.ganttRoomRow;
    const active = id != null && set.has(id);
    el.classList.toggle("gantt-room-row--drag-span", active);
    el.classList.toggle(
      "gantt-room-row--drag-span-conflict",
      active && !!preview?.hasConflict
    );
    const node = el as HTMLElement;
    if (active && preview) {
      node.style.setProperty("--gantt-drag-left", `${preview.leftPct}%`);
      node.style.setProperty("--gantt-drag-width", `${preview.widthPct}%`);
    } else {
      node.style.removeProperty("--gantt-drag-left");
      node.style.removeProperty("--gantt-drag-width");
    }
  });
}

export function clearGanttRoomDragSpan(): void {
  setGanttRoomDragSpan([]);
}
