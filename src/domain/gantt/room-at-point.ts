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

/**
 * Find the room row at a given point. When dragging a booking bar,
 * the dragged element sits on top and its closest room row is the
 * SOURCE — not the target. We iterate ALL elements at the point
 * and return the DEEPEST room row (the one underneath the drag layer),
 * which is the actual drop target.
 *
 * @param excludeRoomId — skip this room (the source) to find the target underneath
 */
export function findGanttRoomAtPoint(
  clientX: number,
  clientY: number,
  excludeRoomId?: string
): string | null {
  if (typeof document === "undefined") return null;
  const els = document.elementsFromPoint(clientX, clientY);
  let firstFound: string | null = null;
  for (const el of els) {
    if (el instanceof HTMLElement) {
      const row = el.closest(ROOM_ROW_SELECTOR) as HTMLElement | null;
      if (row?.dataset.ganttRoomRow) {
        const roomId = row.dataset.ganttRoomRow;
        // When excluding source room, skip it and find the one underneath
        if (excludeRoomId && roomId === excludeRoomId) {
          if (!firstFound) firstFound = roomId;
          continue;
        }
        return roomId;
      }
    }
  }
  // Fallback: if we only found the excluded room, return it anyway
  // (user didn't drag far enough to reach another row)
  return firstFound;
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
