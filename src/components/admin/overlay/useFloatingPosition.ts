"use client";

import { useEffect, useState, type CSSProperties } from "react";

export function useFloatingPosition(
  open: boolean,
  anchorRect: DOMRect | null,
  width: number,
  variant: "popover" | "modal"
) {
  const [style, setStyle] = useState<CSSProperties>({});

  useEffect(() => {
    if (!open) return;

    if (variant === "modal") {
      setStyle({});
      return;
    }

    if (!anchorRect) {
      setStyle({ top: "50%", left: "50%", transform: "translate(-50%, -50%)" });
      return;
    }

    const pad = 4;
    const maxH = Math.min(420, window.innerHeight - 48);
    let left = anchorRect.left + anchorRect.width / 2 - width / 2;
    left = Math.max(12, Math.min(left, window.innerWidth - width - 12));

    let top = anchorRect.top - pad;
    let transform = "translateY(-100%)";

    const aboveTop = top - maxH;
    if (aboveTop < 12) {
      top = anchorRect.bottom + pad;
      transform = "none";
    }

    setStyle({ top, left, transform, maxHeight: maxH });
  }, [open, anchorRect, width, variant]);

  return style;
}
