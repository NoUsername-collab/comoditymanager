export type BulkNamingMode = "prefix" | "number_only";

/** Generează numele camerelor pentru bulk create (aceeași logică client + server). */
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
      const prefix = namePrefix.trim();
      names.push(prefix ? `${prefix}${num}` : String(num));
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
