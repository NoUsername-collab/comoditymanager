"use client";

import type { PinnedSelection } from "@/domain/gantt/pinned-selection";
import { formatStayPeriod } from "@/lib/ro-calendar";
import { useLocale, useTranslations } from "next-intl";

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
  const tCommon = useTranslations("admin.common");
  const tGantt = useTranslations("admin.gantt");
  const locale = useLocale();
  const count = selection.roomIds.length;
  const period = formatStayPeriod(selection.checkIn, selection.checkOut, locale, true);

  return (
    <div className="gantt-pinned-chip" role="status">
      <span className="gantt-pinned-chip__info">
        <strong>{count}</strong> {count === 1 ? tCommon("room") : tCommon("rooms")} &middot;{" "}
        {period}
      </span>
      <button
        type="button"
        className="gantt-pinned-chip__btn gantt-pinned-chip__btn--commit"
        onClick={onCommit}
      >
        {tCommon("create")}
      </button>
      <button
        type="button"
        className="gantt-pinned-chip__btn gantt-pinned-chip__btn--cancel"
        onClick={onCancel}
        aria-label={tGantt("pinned.cancelSelection")}
      >
        ×
      </button>
    </div>
  );
}
