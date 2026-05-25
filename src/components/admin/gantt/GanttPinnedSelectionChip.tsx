"use client";

import type { PinnedSelection } from "@/domain/gantt/pinned-selection";
import { formatStayPeriod } from "@/lib/ro-calendar";

type Props = {
  selection: PinnedSelection;
  onCommit: () => void;
  onCancel: () => void;
};

export function GanttPinnedSelectionChip({
  selection,
  onCommit,
  onCancel,
}: Props) {
  const count = selection.roomIds.length;
  const period = formatStayPeriod(selection.checkIn, selection.checkOut, true);

  return (
    <div className="gantt-pinned-chip" role="status">
      <span className="gantt-pinned-chip__info">
        <strong>{count}</strong> {count === 1 ? "cameră" : "camere"} &middot;{" "}
        {period}
      </span>
      <button
        type="button"
        className="gantt-pinned-chip__btn gantt-pinned-chip__btn--commit"
        onClick={onCommit}
      >
        Creează
      </button>
      <button
        type="button"
        className="gantt-pinned-chip__btn gantt-pinned-chip__btn--cancel"
        onClick={onCancel}
        aria-label="Anulează selecția"
      >
        ×
      </button>
    </div>
  );
}
