const ROOM_ROW_SELECTOR = "[data-gantt-room-row]";

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

export function setGanttRoomDragSpan(roomIds: string[]): void {
  if (typeof document === "undefined") return;
  const set = new Set(roomIds);
  document.querySelectorAll(ROOM_ROW_SELECTOR).forEach((el) => {
    const id = (el as HTMLElement).dataset.ganttRoomRow;
    el.classList.toggle("gantt-room-row--drag-span", id != null && set.has(id));
  });
}

export function clearGanttRoomDragSpan(): void {
  setGanttRoomDragSpan([]);
}
