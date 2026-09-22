/** Read the first non-empty localStorage value in key order. */
export function readLocalStorageFirst(keys: string[]): string | null {
  if (typeof window === "undefined") return null;
  try {
    for (const key of keys) {
      const value = localStorage.getItem(key);
      if (value != null && value !== "") return value;
    }
  } catch {
    /* private mode / quota */
  }
  return null;
}
