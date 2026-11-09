"use client";

import { useCallback, useRef, useState } from "react";

/** Changes this close together are one step: typing a word is undone at once. */
const GROUP_MS = 700;
const MAX_STEPS = 100;

type History<T> = { past: T[]; present: T; future: T[] };

/**
 * The editor draft with undo and redo. Every change is a step, except that a
 * burst of changes (typing) is grouped into one. `carry` keeps what must not
 * travel back in time (the language being edited) when stepping.
 */
export function useDraftHistory<T>(initial: () => T, carry: (from: T, to: T) => T = (_, to) => to) {
  const [history, setHistory] = useState<History<T>>(() => ({
    past: [],
    present: initial(),
    future: [],
  }));
  const lastChangeRef = useRef(0);

  const set = useCallback((update: T | ((current: T) => T), options: { record?: boolean } = {}) => {
    // Decided outside the state updater, which React may run twice.
    const now = Date.now();
    const grouped = now - lastChangeRef.current < GROUP_MS;
    const record = options.record !== false;
    if (record) lastChangeRef.current = now;
    setHistory((current) => {
      const next =
        typeof update === "function" ? (update as (value: T) => T)(current.present) : update;
      if (next === current.present) return current;
      if (!record) return { ...current, present: next };
      const past =
        grouped && current.past.length > 0
          ? current.past
          : [...current.past, current.present].slice(-MAX_STEPS);
      return { past, present: next, future: [] };
    });
  }, []);

  const undo = useCallback(() => {
    lastChangeRef.current = 0;
    setHistory((current) => {
      const previous = current.past.at(-1);
      if (previous === undefined) return current;
      return {
        past: current.past.slice(0, -1),
        present: carry(current.present, previous),
        future: [current.present, ...current.future],
      };
    });
  }, [carry]);

  const redo = useCallback(() => {
    lastChangeRef.current = 0;
    setHistory((current) => {
      const [next, ...rest] = current.future;
      if (next === undefined) return current;
      return {
        past: [...current.past, current.present],
        present: carry(current.present, next),
        future: rest,
      };
    });
  }, [carry]);

  return {
    draft: history.present,
    setDraft: set,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
  };
}
