"use client";

import { useEffect, useState, type CSSProperties } from "react";
import {
  getViewportClampMargin,
  getVisualViewportBox,
} from "@/lib/ui/viewport-position";

function computePopoverStyle(
  anchorRect: DOMRect,
  width: number
): CSSProperties {
  const pad = 4;
  const margin = getViewportClampMargin(12);
  const { width: vw, height: vh, offsetTop, offsetLeft } = getVisualViewportBox();
  const maxH = Math.min(420, vh - margin * 2);
  let left = anchorRect.left + anchorRect.width / 2 - width / 2;
  left = Math.max(
    offsetLeft + margin,
    Math.min(left, offsetLeft + vw - width - margin)
  );

  let top = anchorRect.top - pad;
  let transform = "translateY(-100%)";

  const aboveTop = top - maxH;
  if (aboveTop < offsetTop + margin) {
    top = anchorRect.bottom + pad;
    transform = "none";
  }

  top = Math.min(
    Math.max(top, offsetTop + margin),
    offsetTop + vh - maxH - margin
  );

  return { top, left, transform, maxHeight: maxH };
}

export function useFloatingPosition(
  open: boolean,
  anchorRect: DOMRect | null,
  width: number,
  variant: "popover" | "modal"
) {
  const [style, setStyle] = useState<CSSProperties>(() => {
    if (!open || variant === "modal" || !anchorRect || typeof window === "undefined") {
      return {};
    }
    return computePopoverStyle(anchorRect, width);
  });

  const anchorKey =
    anchorRect == null
      ? ""
      : `${anchorRect.top}|${anchorRect.left}|${anchorRect.width}|${anchorRect.height}`;

  useEffect(() => {
    if (!open) return;

    if (variant === "modal") {
      setStyle((prev) => (Object.keys(prev).length === 0 ? prev : {}));
      return;
    }

    if (!anchorRect) {
      const centered = {
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      } as const;
      setStyle((prev) =>
        prev.top === centered.top &&
        prev.left === centered.left &&
        prev.transform === centered.transform
          ? prev
          : centered
      );
      return;
    }

    const next = computePopoverStyle(anchorRect, width);
    setStyle((prev) =>
      prev.top === next.top &&
      prev.left === next.left &&
      prev.transform === next.transform &&
      prev.maxHeight === next.maxHeight
        ? prev
        : next
    );
  }, [open, anchorKey, anchorRect, width, variant]);

  return style;
}
