"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSettingsUnsavedWarning } from "@/hooks/useSettingsUnsavedWarning";

export type SettingsSaveResult = { ok: true } | { ok: false; error?: string };

export type SettingsDraft<T extends Record<string, unknown>> = {
  values: T;
  set: <K extends keyof T>(key: K, value: T[K]) => void;
  dirty: boolean;
  saving: boolean;
  error: string | null;
  /** True after a save until the next edit. */
  saved: boolean;
  save: () => Promise<void>;
  discard: () => void;
};

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * The settings save model: toggles and pickers save on change; typed values
 * (text, numbers, lists like seasons) wait here as a draft until the owner
 * presses Save in the bottom bar, or discards them.
 */
export function useSettingsDraft<T extends Record<string, unknown>>(
  initial: T,
  onSave: (values: T, changed: Partial<T>) => Promise<SettingsSaveResult>,
): SettingsDraft<T> {
  const [values, setValues] = useState<T>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const savedRef = useRef<T>(initial);

  // New saved values from the server: adopt them unless the owner is mid-edit.
  const initialKey = JSON.stringify(initial);
  useEffect(() => {
    const next = JSON.parse(initialKey) as T;
    setValues((current) => (same(current, savedRef.current) ? next : current));
    savedRef.current = next;
  }, [initialKey]);

  const changed = (Object.keys(values) as (keyof T)[]).filter(
    (key) => !same(values[key], savedRef.current[key]),
  );
  const dirty = changed.length > 0;
  useSettingsUnsavedWarning(dirty && !saving);

  const set = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setSaved(false);
    setError(null);
  }, []);

  const save = useCallback(async () => {
    if (!dirty || saving) return;
    const snapshot = values;
    const partial = Object.fromEntries(changed.map((key) => [key, snapshot[key]])) as Partial<T>;
    setSaving(true);
    setError(null);
    try {
      const result = await onSave(snapshot, partial);
      if (result.ok) {
        savedRef.current = snapshot;
        setSaved(true);
      } else {
        setError(result.error ?? "");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "");
    } finally {
      setSaving(false);
    }
  }, [changed, dirty, onSave, saving, values]);

  const discard = useCallback(() => {
    setValues(savedRef.current);
    setError(null);
    setSaved(false);
  }, []);

  return { values, set, dirty, saving, error, saved, save, discard };
}
