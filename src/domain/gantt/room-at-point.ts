const ROOM_ROW_SELECTOR = "[data-gantt-room-row]";
const ROOM_DRAG_LAYER_SELECTOR = "[data-gantt-room-drag-layer]";
let activeDropTargetId: string | null = null;
let activeDragSpanIds = new Set<string>();
let activePinnedIds = new Set<string>();

type GanttRoomDragPreview = {
  leftPct: number;
  widthPct: number;
  hasConflict: boolean;
};

function escapeSelectorValue(value: string): string {
  return typeof CSS !== "undefined" && typeof CSS.escape === "function"
    ? CSS.escape(value)
    : value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function roomRowSelector(roomId: string): string {
  const escaped = escapeSelectorValue(roomId);
  return `${ROOM_ROW_SELECTOR}[data-gantt-room-row="${escaped}"]`;
}

function roomDragLayerSelector(roomId: string): string {
  const escaped =
    escapeSelectorValue(roomId);
  return `${ROOM_DRAG_LAYER_SELECTOR}[data-gantt-room-drag-layer="${escaped}"]`;
}

function getRoomRow(roomId: string): HTMLElement | null {
  if (typeof document === "undefined") return null;
  return document.querySelector(roomRowSelector(roomId)) as HTMLElement | null;
}

function getRoomDragLayer(roomId: string): HTMLElement | null {
  if (typeof document === "undefined") return null;
  return document.querySelector(roomDragLayerSelector(roomId)) as HTMLElement | null;
}

export function getGanttRoomDragLayer(roomId: string): HTMLElement | null {
  return getRoomDragLayer(roomId);
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
    const active = nextIds.has(roomId);
    const row = getRoomRow(roomId);
    const layer = getRoomDragLayer(roomId);

    row?.classList.toggle("gantt-room-row--drag-span", active);
    row?.classList.toggle(
      "gantt-room-row--drag-span-conflict",
      active && !!preview?.hasConflict
    );

    layer?.classList.toggle("gantt-room-row--drag-span", active);
    layer?.classList.toggle(
      "gantt-room-row--drag-span-conflict",
      active && !!preview?.hasConflict
    );

    if (active && preview) {
      layer?.style.setProperty("--gantt-drag-left", `${preview.leftPct}%`);
      layer?.style.setProperty("--gantt-drag-width", `${preview.widthPct}%`);
    } else {
      layer?.style.removeProperty("--gantt-drag-left");
      layer?.style.removeProperty("--gantt-drag-width");
    }
  }

  activeDragSpanIds = nextIds;
}

export function clearGanttRoomDragSpan(): void {
  setGanttRoomDragSpan([]);
}

export function setGanttRoomPinnedSpan(
  roomIds: string[],
  preview?: GanttRoomDragPreview
): void {
  if (typeof document === "undefined") return;
  const nextIds = new Set(roomIds);
  const touchedIds = new Set([...activePinnedIds, ...nextIds]);

  for (const roomId of touchedIds) {
    const active = nextIds.has(roomId);
    const row = getRoomRow(roomId);
    const layer = getRoomDragLayer(roomId);

    row?.classList.toggle("gantt-room-row--pinned", active);
    layer?.classList.toggle("gantt-room-row--pinned", active);

    if (active && preview) {
      layer?.style.setProperty("--gantt-pinned-left", `${preview.leftPct}%`);
      layer?.style.setProperty("--gantt-pinned-width", `${preview.widthPct}%`);
    } else {
      layer?.style.removeProperty("--gantt-pinned-left");
      layer?.style.removeProperty("--gantt-pinned-width");
    }
  }

  activePinnedIds = nextIds;
}

export function clearGanttRoomPinnedSpan(): void {
  setGanttRoomPinnedSpan([]);
}
