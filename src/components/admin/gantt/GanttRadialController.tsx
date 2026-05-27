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
};

type RadialAction = {
  id: "request" | "booking" | "hold" | "move" | "block" | "checkin" | "checkout";
  label: string;
  title: string;
  side: "left" | "right";
  kind: "create" | "manage";
  onClick: () => void;
};

export function GanttRadialController({
  onOpenRequest,
  onOpenHold,
  onOpenMove,
  onOpenBlock,
  onOpenReception,
  onOpenCheckIn,
  onOpenCheckOut,
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
    {
      id: "move",
      label: tGantt("radial.move"),
      title: tGantt("radial.moveTitle"),
      side: "left",
      kind: "manage",
      onClick: onOpenMove,
    },
    ...(onOpenCheckIn
      ? [
          {
            id: "checkin" as const,
            label: "In",
            title: tGantt("radial.checkInTitle"),
            side: "left" as const,
            kind: "manage" as const,
            onClick: onOpenCheckIn,
          },
        ]
      : []),
    ...(onOpenCheckOut
      ? [
          {
            id: "checkout" as const,
            label: "Out",
            title: tGantt("radial.checkOutTitle"),
            side: "left" as const,
            kind: "manage" as const,
            onClick: onOpenCheckOut,
          },
        ]
      : []),
    {
      id: "hold",
      label: tGantt("radial.hold"),
      title: tGantt("radial.holdTitle"),
      side: "left",
      kind: "create",
      onClick: onOpenHold,
    },
    {
      id: "request",
      label: tGantt("radial.request"),
      title: tGantt("radial.requestTitle"),
      side: "right",
      kind: "create",
      onClick: onOpenRequest,
    },
    {
      id: "booking",
      label: tGantt("radial.booking"),
      title: tGantt("radial.bookingTitle"),
      side: "right",
      kind: "create",
      onClick: onOpenReception,
    },
    {
      id: "block",
      label: tGantt("radial.block"),
      title: tGantt("radial.blockTitle"),
      side: "right",
      kind: "create",
      onClick: onOpenBlock,
    },
  ];

  const leftActions = actions.filter((action) => action.side === "left");
  const rightActions = actions.filter((action) => action.side === "right");

  return (
    <div
      ref={rootRef}
      className={["gantt-radial", open && "gantt-radial--open"]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="gantt-radial__rail gantt-radial__rail--left">
        {leftActions.map((action) => (
          <button
            key={action.id}
            type="button"
            className={[
              "gantt-radial__action",
              `gantt-radial__action--${action.kind}`,
              open && "gantt-radial__action--visible",
            ]
              .filter(Boolean)
              .join(" ")}
            tabIndex={open ? 0 : -1}
            aria-label={action.title}
            title={action.title}
            onClick={() => {
              action.onClick();
              setOpen(false);
            }}
          >
            <span className="gantt-radial__action-label">{action.label}</span>
          </button>
        ))}
      </div>

      <button
        type="button"
        className="gantt-radial__core"
        aria-expanded={open}
        aria-label={open ? tGantt("radial.closeController") : tGantt("radial.openController")}
        aria-pressed={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="gantt-radial__icon" aria-hidden>
          <span className="gantt-radial__roof" />
          <span className="gantt-radial__body">
            <span className="gantt-radial__door" />
          </span>
        </span>
        <span className="sr-only">{tGantt("radial.home")}</span>
      </button>

      <div className="gantt-radial__rail gantt-radial__rail--right">
        {rightActions.map((action) => (
          <button
            key={action.id}
            type="button"
            className={[
              "gantt-radial__action",
              `gantt-radial__action--${action.kind}`,
              open && "gantt-radial__action--visible",
            ]
              .filter(Boolean)
              .join(" ")}
            tabIndex={open ? 0 : -1}
            aria-label={action.title}
            title={action.title}
            onClick={() => {
              action.onClick();
              setOpen(false);
            }}
          >
            <span className="gantt-radial__action-label">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
