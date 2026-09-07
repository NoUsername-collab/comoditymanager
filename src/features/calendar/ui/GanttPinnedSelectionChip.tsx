"use client";

import type { PinnedSelection } from "@/domain/gantt/pinned-selection";
import { formatStayPeriod } from "@/lib/ro-calendar";
import { useLocale, useTranslations } from "next-intl";
import { useGanttContextMenu } from "@/features/calendar/ui/GanttContextMenuContext";

type ChipProps = {
  selection: PinnedSelection;
  onCommit: (point: { clientX: number; clientY: number }) => void;
  onCancel: () => void;
};

export function GanttPinnedSelectionChip({
  selection,
  onCommit,
  onCancel,
}: ChipProps) {
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
        onClick={(e) => onCommit({ clientX: e.clientX, clientY: e.clientY })}
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

export function GanttPinnedCreateChip({
  selection,
  roomName,
  onCancel,
}: {
  selection: PinnedSelection;
  roomName: string;
  onCancel: () => void;
}) {
  const { openMenu } = useGanttContextMenu();

  return (
    <GanttPinnedSelectionChip
      selection={selection}
      onCommit={({ clientX, clientY }) => {
        const firstRoomId = selection.roomIds[0] ?? "";
        openMenu({
          kind: "create",
          clientX,
          clientY,
          roomId: firstRoomId,
          roomName,
          checkIn: selection.checkIn,
          checkOut: selection.checkOut,
          hasConflict: false,
          roomIds: selection.roomIds,
        });
        onCancel();
      }}
      onCancel={onCancel}
    />
  );
}
