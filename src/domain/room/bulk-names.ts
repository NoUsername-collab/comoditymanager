export type BulkNamingMode = "prefix" | "number_only";

/** Floor 1 uses stem 10, so room 10 is 110. Floor 12 uses stem 120, so room 3 is 1203. */
export function floorNumberPrefix(level: number): string | null {
  if (!Number.isInteger(level) || level < 1) return null;
  return String(level * 10);
}

export function floorLevelFromStructure(
  levelNumber: number | null | undefined,
  name: string,
): number | null {
  if (
    levelNumber != null &&
    Number.isInteger(levelNumber) &&
    levelNumber >= 1
  ) {
    return levelNumber;
  }
  const match = name.trim().match(/(\d+)\s*$/);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : null;
}

export function isDigitPrefix(prefix: string): boolean {
  return /^\d+$/.test(prefix);
}

/**
 * A digit prefix is a floor stem, not text glued to the room index.
 * Stem 10 and room 10 become 110. A text prefix stays "Camera" + 1.
 */
export function joinRoomPrefix(prefix: string, roomNumber: number): string {
  const trimmed = prefix.trim();
  if (!trimmed) return String(roomNumber);
  if (isDigitPrefix(trimmed)) {
    return String(Number(trimmed) * 10 + roomNumber);
  }
  return `${trimmed}${roomNumber}`;
}

/** Room names for bulk create. The same rule runs in the form and on the server. */
export function buildBulkRoomNames(
  mode: BulkNamingMode,
  namePrefix: string,
  startNumber: number,
  count: number
): string[] {
  if (count < 1) return [];
  const names: string[] = [];
  for (let i = 0; i < count; i++) {
    const num = startNumber + i;
    if (mode === "number_only") {
      names.push(String(num));
    } else {
      names.push(joinRoomPrefix(namePrefix, num));
    }
  }
  return names.map((n) => n.trim()).filter(Boolean);
}

export function normalizeRoomNameKey(name: string): string {
  return name.trim().toLowerCase();
}

/** Returnează numele care există deja sau se repetă în listă. */
export function findDuplicateRoomNames(
  existingNames: string[],
  proposedNames: string[]
): string[] {
  const taken = new Set(existingNames.map(normalizeRoomNameKey));
  const batch = new Set<string>();
  const conflicts: string[] = [];

  for (const name of proposedNames) {
    const key = normalizeRoomNameKey(name);
    if (!key) continue;
    if (taken.has(key) || batch.has(key)) {
      conflicts.push(name);
    }
    batch.add(key);
    taken.add(key);
  }

  return [...new Set(conflicts)];
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Următorul număr liber pentru bulk, după camerele existente în clădire. */
export function suggestNextBulkStartNumber(
  existingNames: string[],
  mode: BulkNamingMode,
  namePrefix: string
): number {
  if (mode === "number_only") {
    let max = 0;
    for (const name of existingNames) {
      const n = Number.parseInt(name.trim(), 10);
      if (!Number.isNaN(n) && n > max) max = n;
    }
    return max > 0 ? max + 1 : 1;
  }

  const prefix = namePrefix.trim();
  if (isDigitPrefix(prefix)) {
    const base = Number(prefix) * 10;
    let maxIndex = 0;
    for (const name of existingNames) {
      const value = Number.parseInt(name.trim(), 10);
      if (!Number.isFinite(value) || String(value) !== name.trim()) continue;
      const index = value - base;
      if (index >= 1 && index <= 99 && index > maxIndex) maxIndex = index;
    }
    return maxIndex > 0 ? maxIndex + 1 : 1;
  }

  let max = 0;
  const re = prefix
    ? new RegExp(`^${escapeRegex(prefix)}(\\d+)\\s*$`, "i")
    : /^(\d+)\s*$/;

  for (const name of existingNames) {
    const m = name.trim().match(re);
    if (m) {
      const n = Number.parseInt(m[1]!, 10);
      if (!Number.isNaN(n) && n > max) max = n;
    }
  }

  return max > 0 ? max + 1 : 1;
}
