"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  onOpenHold: () => void;
  onOpenBlock: () => void;
  onOpenReception: () => void;
  onScrollToToday: () => void;
};

type RadialAction = {
  id: "today" | "hold" | "block" | "booking";
  label: string;
  position: "top" | "left" | "right" | "bottom";
  tone: "emerald" | "amber" | "slate" | "sky";
  onClick: () => void;
};

export function GanttRadialController({
  onOpenHold,
  onOpenBlock,
  onOpenReception,
  onScrollToToday,
}: Props) {
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
      id: "today",
      label: "Azi",
      position: "top",
      tone: "emerald",
      onClick: onScrollToToday,
    },
    {
      id: "hold",
      label: "Hold",
      position: "left",
      tone: "amber",
      onClick: onOpenHold,
    },
    {
      id: "block",
      label: "Blocare",
      position: "right",
      tone: "slate",
      onClick: onOpenBlock,
    },
    {
      id: "booking",
      label: "Rezervare",
      position: "bottom",
      tone: "sky",
      onClick: onOpenReception,
    },
  ];

  return (
    <div
      ref={rootRef}
      className={["gantt-radial", open && "gantt-radial--open"]
        .filter(Boolean)
        .join(" ")}
    >
      {actions.map((action) => (
        <button
          key={action.id}
          type="button"
          className={[
            "gantt-radial__action",
            `gantt-radial__action--${action.position}`,
            `gantt-radial__action--${action.tone}`,
            open && "gantt-radial__action--visible",
          ]
            .filter(Boolean)
            .join(" ")}
          tabIndex={open ? 0 : -1}
          onClick={() => {
            action.onClick();
            setOpen(false);
          }}
        >
          {action.label}
        </button>
      ))}

      <button
        type="button"
        className="gantt-radial__core"
        aria-expanded={open}
        aria-label={open ? "Închide controllerul rapid" : "Deschide controllerul rapid"}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="gantt-radial__icon" aria-hidden>
          <span className="gantt-radial__roof" />
          <span className="gantt-radial__body">
            <span className="gantt-radial__door" />
          </span>
        </span>
        <span className="sr-only">Casa</span>
      </button>
    </div>
  );
}
