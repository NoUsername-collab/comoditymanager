function readCssPxVariable(name: string): number {
  if (typeof document === "undefined") return 0;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const value = parseFloat(raw);
  return Number.isFinite(value) ? value : 0;
}

/** Minimum clamp margin including safe-area insets (notch / home bar). */
export function getViewportClampMargin(fallback = 8): number {
  const safe = Math.max(
    readCssPxVariable("--ml-safe-left"),
    readCssPxVariable("--ml-safe-right"),
    readCssPxVariable("--ml-safe-top"),
    readCssPxVariable("--ml-safe-bottom")
  );
  return Math.max(fallback, safe, 12);
}

/** Visual viewport (mobile browser chrome, zoom) or window fallback. */
export function getVisualViewportBox() {
  if (typeof window === "undefined") {
    return { width: 0, height: 0, offsetTop: 0, offsetLeft: 0 };
  }
  const vv = window.visualViewport;
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

/** Clamp a fixed context menu opened at pointer coordinates inside the visual viewport. */
export function computeFixedPointerMenuPosition(
  clientX: number,
  clientY: number,
  menu: { width: number; height: number },
  options?: {
    margin?: number;
    viewport?: ReturnType<typeof getVisualViewportBox>;
  }
): FixedAnchoredPosition {
  const margin = options?.margin ?? getViewportClampMargin(12);
  const { width: vw, height: vh, offsetTop, offsetLeft } =
    options?.viewport ?? getVisualViewportBox();

  const minLeft = offsetLeft + margin;
  const maxLeft = offsetLeft + vw - menu.width - margin;
  const left =
    vw <= 0 || maxLeft < minLeft
      ? minLeft
      : Math.min(Math.max(clientX, minLeft), maxLeft);

  const minTop = offsetTop + margin;
  const maxTop = offsetTop + vh - menu.height - margin;
  const top =
    vh <= 0 || maxTop < minTop
      ? minTop
      : Math.min(Math.max(clientY, minTop), maxTop);

  return { top, left };
}

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
  const margin = options?.margin ?? getViewportClampMargin(8);
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
