"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

type Props = {
  onOpenRequest: () => void;
  onOpenHold: () => void;
  onOpenMove: () => void;
  onOpenBlock: () => void;
  onOpenReception: () => void;
  onOpenCheckIn?: () => void;
  onOpenCheckOut?: () => void;
  /** Today board badge counts */
  cereriCount?: number;
  arrivalsCount?: number;
  departuresCount?: number;
  cleanCount?: number;
};

type RadialAction = {
  id: string;
  label: string;
  title: string;
  kind: "create" | "manage";
  onClick: () => void;
};

/**
 * Gantt center controller with reveal/collapse animation.
 *
 * COLLAPSED: Shows today badges (new / in / out / clean) + reveal arrow on right
 * EXPANDED: Badges pushed out right, action buttons slide in from left.
 *           Collapse button fixed at left edge.
 */
export function GanttRadialController({
  onOpenRequest,
  onOpenHold,
  onOpenMove,
  onOpenBlock,
  onOpenReception,
  onOpenCheckIn,
  onOpenCheckOut,
  cereriCount = 0,
  arrivalsCount = 0,
  departuresCount = 0,
  cleanCount = 0,
}: Props) {
  const tGantt = useTranslations("admin.gantt");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const actions: RadialAction[] = [
    ...(onOpenCheckIn
      ? [{
          id: "checkin",
          label: "In",
          title: tGantt("radial.checkInTitle"),
          kind: "manage" as const,
          onClick: onOpenCheckIn,
        }]
      : []),
    ...(onOpenCheckOut
      ? [{
          id: "checkout",
          label: "Out",
          title: tGantt("radial.checkOutTitle"),
          kind: "manage" as const,
          onClick: onOpenCheckOut,
        }]
      : []),
    {
      id: "move",
      label: tGantt("radial.move"),
      title: tGantt("radial.moveTitle"),
      kind: "manage",
      onClick: onOpenMove,
    },
    {
      id: "hold",
      label: tGantt("radial.hold"),
      title: tGantt("radial.holdTitle"),
      kind: "create",
      onClick: onOpenHold,
    },
    {
      id: "request",
      label: tGantt("radial.request"),
      title: tGantt("radial.requestTitle"),
      kind: "create",
      onClick: onOpenRequest,
    },
    {
      id: "booking",
      label: tGantt("radial.booking"),
      title: tGantt("radial.bookingTitle"),
      kind: "create",
      onClick: onOpenReception,
    },
    {
      id: "block",
      label: tGantt("radial.block"),
      title: tGantt("radial.blockTitle"),
      kind: "create",
      onClick: onOpenBlock,
    },
  ];

  return (
    <div
      ref={rootRef}
      className="gantt-action-strip"
    >
      {/* Collapse button — fixed left edge, visible when expanded */}
      <button
        type="button"
        className={`gantt-action-strip__collapse ${open ? "gantt-action-strip__collapse--visible" : ""}`}
        onClick={() => setOpen(false)}
        title="Ascunde"
        tabIndex={open ? 0 : -1}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      {/* Track — badges and buttons slide on this horizontal rail */}
      <div className="gantt-action-strip__track">
        {/* Badges layer */}
        <div className={`gantt-action-strip__badges ${open ? "gantt-action-strip__badges--out" : ""}`}>
          <span className={`gantt-action-strip__badge gantt-action-strip__badge--new ${cereriCount > 0 ? "gantt-action-strip__badge--pulse" : ""}`}>
            <strong>{cereriCount}</strong> new
          </span>
          <span className="gantt-action-strip__badge gantt-action-strip__badge--in">
            <strong>{arrivalsCount}</strong> in
          </span>
          <span className="gantt-action-strip__badge gantt-action-strip__badge--out">
            <strong>{departuresCount}</strong> out
          </span>
          <span className="gantt-action-strip__badge gantt-action-strip__badge--clean">
            <strong>{cleanCount}</strong> clean
          </span>
        </div>

        {/* Actions layer */}
        <div className={`gantt-action-strip__actions ${open ? "gantt-action-strip__actions--in" : ""}`}>
          {actions.map((action, i) => (
            <button
              key={action.id}
              type="button"
              className={`gantt-action-strip__btn gantt-action-strip__btn--${action.kind}`}
              style={{ transitionDelay: open ? `${i * 35}ms` : "0ms" }}
              tabIndex={open ? 0 : -1}
              title={action.title}
              onClick={() => {
                action.onClick();
                setOpen(false);
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>

      {/* Reveal button — visible when collapsed */}
      <button
        type="button"
        className={`gantt-action-strip__reveal ${open ? "gantt-action-strip__reveal--hidden" : ""}`}
        onClick={() => setOpen(true)}
        title="Acțiuni rapide"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </div>
  );
}
