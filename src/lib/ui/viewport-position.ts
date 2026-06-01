/** Visual viewport (mobile browser chrome, zoom) or window fallback. */
export function getVisualViewportBox() {
  const vv = typeof window !== "undefined" ? window.visualViewport : null;
  return {
    width: vv?.width ?? window.innerWidth,
    height: vv?.height ?? window.innerHeight,
    offsetTop: vv?.offsetTop ?? 0,
    offsetLeft: vv?.offsetLeft ?? 0,
  };
}

export type FixedAnchoredPosition = {
  top: number;
  left: number;
};

/**
 * Place a fixed dropdown near a trigger, clamped inside the visible viewport.
 * Flips above the trigger when there is not enough space below.
 */
export function computeFixedDropdownPosition(
  trigger: DOMRect,
  menu: { width: number; height: number },
  options?: { gap?: number; margin?: number }
): FixedAnchoredPosition {
  const gap = options?.gap ?? 8;
  const margin = options?.margin ?? 8;
  const { width: vw, height: vh, offsetTop, offsetLeft } = getVisualViewportBox();

  let top = trigger.bottom + gap + offsetTop;
  let left = trigger.right - menu.width + offsetLeft;

  const spaceBelow = offsetTop + vh - trigger.bottom - gap;
  const spaceAbove = trigger.top - offsetTop - gap;
  if (menu.height > spaceBelow && spaceAbove >= menu.height) {
    top = trigger.top - menu.height - gap + offsetTop;
  }

  left = Math.min(
    Math.max(left, offsetLeft + margin),
    offsetLeft + vw - menu.width - margin
  );

  const maxTop = offsetTop + vh - menu.height - margin;
  top = Math.min(Math.max(top, offsetTop + margin), maxTop);

  return { top, left };
}
