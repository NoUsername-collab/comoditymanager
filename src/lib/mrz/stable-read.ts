/** Stabilizează citirea MRZ — acceptă doar după N parse-uri consecutive identice. */

export const DEFAULT_STABLE_READ_COUNT = 3;

export function mrzLinesKey(lines: string[]): string {
  return lines.join("\n");
}

export type StableReadState = {
  count: number;
  required: number;
  stable: boolean;
  key: string | null;
};

export function createStableMrzReader(required = DEFAULT_STABLE_READ_COUNT) {
  let lastKey: string | null = null;
  let count = 0;

  return {
    push(lines: string[] | null): StableReadState {
      if (!lines || lines.length === 0) {
        lastKey = null;
        count = 0;
        return { count: 0, required, stable: false, key: null };
      }

      const key = mrzLinesKey(lines);
      if (key === lastKey) {
        count += 1;
      } else {
        lastKey = key;
        count = 1;
      }

      return {
        count,
        required,
        stable: count >= required,
        key,
      };
    },
    reset() {
      lastKey = null;
      count = 0;
    },
  };
}
