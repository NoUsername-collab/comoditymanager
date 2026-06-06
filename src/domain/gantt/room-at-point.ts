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
 * Find the room row at a given screen coordinate.
 *
 * Uses geometric bounding-rect comparison of all room rows in the DOM,
 * NOT elementsFromPoint (which fails during drag because the dragged
 * booking bar is visually at the cursor but its DOM parent is the
 * source row — closest() always returns source).
 *
 * @param excludeRoomId — optional room to deprioritize (returns it only as fallback)
 */
export function findGanttRoomAtPoint(
  clientX: number,
  clientY: number,
  excludeRoomId?: string
): string | null {
  if (typeof document === "undefined") return null;

  const rows = document.querySelectorAll<HTMLElement>(ROOM_ROW_SELECTOR);
  let best: string | null = null;
  let bestDist = Infinity;

  for (const row of rows) {
    const roomId = row.dataset.ganttRoomRow;
    if (!roomId) continue;

    const rect = row.getBoundingClientRect();
    // Check if cursor Y is within this row's vertical bounds
    if (clientY >= rect.top && clientY <= rect.bottom) {
      // Direct hit — if not excluded, return immediately
      if (roomId !== excludeRoomId) return roomId;
      // It's the excluded room — remember as fallback
      if (!best) best = roomId;
      continue;
    }

    // Track closest row by Y distance (for near-misses at row edges)
    const centerY = rect.top + rect.height / 2;
    const dist = Math.abs(clientY - centerY);
    if (dist < bestDist) {
      bestDist = dist;
      best = roomId;
    }
  }

  return best;
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
