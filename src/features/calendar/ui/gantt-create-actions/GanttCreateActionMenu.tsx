"use client";

import { useTranslations } from "next-intl";
import {
  GANTT_CREATE_ACTION_IDS,
  type GanttCreateActionDisabled,
  type GanttCreateActionId,
} from "./actions";

const ACTION_HINT_KEY = {
  cerere: "unconfirmed",
  direct: "confirmed",
  hold: "temporary",
  block: "unavailable",
} as const;

const ACTION_LABEL_KEY = {
  cerere: "request",
  direct: "direct",
  hold: "hold",
  block: "block",
} as const;

export function GanttCreateActionMenu({
  disabled,
  onSelect,
}: {
  disabled: GanttCreateActionDisabled;
  onSelect: (id: GanttCreateActionId) => void;
}) {
  const t = useTranslations("admin.gantt.quick.radial");

  return (
    <div className="gantt-create-action-menu" role="group">
      {GANTT_CREATE_ACTION_IDS.map((id) => {
        const isDisabled = disabled[id];
        return (
          <button
            key={id}
            type="button"
            role="menuitem"
            disabled={isDisabled}
            aria-disabled={isDisabled}
            onClick={() => onSelect(id)}
            className={[
              "gantt-create-action",
              "admin-booking-tone",
              `admin-booking-tone--${id}`,
              isDisabled && "gantt-create-action--disabled",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <span className="gantt-create-action__label">
              {t(ACTION_LABEL_KEY[id])}
            </span>
            <span className="gantt-create-action__hint">
              {t(ACTION_HINT_KEY[id])}
            </span>
          </button>
        );
      })}
    </div>
  );
}
