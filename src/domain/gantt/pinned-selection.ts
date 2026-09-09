export type PinnedSelection = {
  roomIds: string[];
  checkIn: string;
  checkOut: string;
};

/** Range / tap create replaces the pin. Ctrl-toggle uses a different path. */
export function pinnedSelectionFromRange(
  roomIds: string[],
  checkIn: string,
  checkOut: string
): PinnedSelection | null {
  const unique = [...new Set(roomIds.filter(Boolean))];
  if (unique.length === 0) return null;
  return { roomIds: unique, checkIn, checkOut };
}

export type CreateMenuLifecycle =
  | "open"
  | "dismiss-outside"
  | "dismiss-escape"
  | "pick-action";

/** Highlight stays while the create menu is open; every other event clears it. */
export function shouldClearPinnedOnCreateMenuEvent(
  event: CreateMenuLifecycle
): boolean {
  return event !== "open";
}

export function dismissClearsPinnedSelection(
  menuKind: string | undefined
): boolean {
  return menuKind === "create";
}
