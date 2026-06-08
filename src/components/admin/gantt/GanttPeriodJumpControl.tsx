"use client";

import { useRef } from "react";
import { HudIconCalendar } from "@/components/admin/AdminHudIcons";

export function GanttPeriodJumpControl({
  title,
  valueIso,
  onPrev,
  onNext,
  onJump,
  prevAria,
  nextAria,
  jumpAria,
}: {
  title: string;
  valueIso: string;
  onPrev: () => void;
  onNext: () => void;
  onJump: (iso: string) => void;
  prevAria: string;
  nextAria: string;
  jumpAria: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function openDatePicker() {
    const input = inputRef.current;
    if (!input) return;
    if (typeof input.showPicker === "function") {
      try {
        input.showPicker();
        return;
      } catch {
        // Fallback for browsers that block showPicker without user gesture quirks
      }
    }
    input.click();
  }

  return (
    <div className="gantt-compact-toolbar__period-group">
      <div className="gantt-compact-toolbar__period-arrows">
        <button
          type="button"
          className="gantt-compact-toolbar__nav-btn"
          onClick={onPrev}
          aria-label={prevAria}
        >
          ‹
        </button>
        <button
          type="button"
          className="gantt-compact-toolbar__nav-btn"
          onClick={onNext}
          aria-label={nextAria}
        >
          ›
        </button>
      </div>

      <button
        type="button"
        className="gantt-compact-toolbar__period-jump"
        onClick={openDatePicker}
        aria-label={jumpAria}
        title={jumpAria}
      >
        <span className="gantt-compact-toolbar__title capitalize">{title}</span>
        <HudIconCalendar className="gantt-compact-toolbar__jump-icon" />
      </button>

      <input
        ref={inputRef}
        type="date"
        className="gantt-compact-toolbar__date-input-hidden"
        value={valueIso}
        onChange={(e) => {
          if (e.target.value) onJump(e.target.value);
        }}
        tabIndex={-1}
        aria-hidden
      />
    </div>
  );
}
