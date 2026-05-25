"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  onOpenRequest: () => void;
  onOpenHold: () => void;
  onOpenMove: () => void;
  onOpenBlock: () => void;
  onOpenReception: () => void;
};

type RadialAction = {
  id: "request" | "booking" | "hold" | "move" | "block";
  label: string;
  hint: string;
  position: "top-left" | "top-right" | "left" | "right" | "bottom";
  tone: "emerald" | "amber" | "slate" | "sky" | "violet";
  onClick: () => void;
};

export function GanttRadialController({
  onOpenRequest,
  onOpenHold,
  onOpenMove,
  onOpenBlock,
  onOpenReception,
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
      id: "request",
      label: "Cerere",
      hint: "noua",
      position: "top-left",
      tone: "violet",
      onClick: onOpenRequest,
    },
    {
      id: "booking",
      label: "Rezervare",
      hint: "directa",
      position: "top-right",
      tone: "sky",
      onClick: onOpenReception,
    },
    {
      id: "hold",
      label: "Hold",
      hint: "temporar",
      position: "left",
      tone: "amber",
      onClick: onOpenHold,
    },
    {
      id: "move",
      label: "Muta",
      hint: "camera",
      position: "bottom",
      tone: "emerald",
      onClick: onOpenMove,
    },
    {
      id: "block",
      label: "Blocare",
      hint: "indisp.",
      position: "right",
      tone: "slate",
      onClick: onOpenBlock,
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
          <span className="gantt-radial__action-label">{action.label}</span>
          <span className="gantt-radial__action-hint">{action.hint}</span>
        </button>
      ))}

      <button
        type="button"
        className="gantt-radial__core"
        aria-expanded={open}
        aria-label={open ? "Închide controllerul rapid" : "Deschide controllerul rapid"}
        aria-pressed={open}
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
