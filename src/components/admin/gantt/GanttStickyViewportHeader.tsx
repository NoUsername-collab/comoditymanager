"use client";

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import { debounce } from "@/lib/debounce";
import { LAYOUT_RESIZE_DEBOUNCE_MS } from "@/layout/mobile/viewport";
import type { GanttViewRange } from "@/domain/gantt/view-range";
import { AdminPortal } from "@/components/admin/overlay/AdminPortal";
import { GanttDayHeader } from "./GanttDayHeader";
import type { GanttDayGridOptions, StickyViewportState } from "./GanttGridHelpers";
import { useCompactLayoutHints } from "@/hooks/useMobileLayout";
import { useLocale, useTranslations } from "next-intl";

export function GanttStickyViewportHeader({
  scrollRef,
  shellRef,
  theadRef,
  viewRange,
  compact,
  onPanPointerDown,
  panActive,
  scrollTitle,
  dayGridOptions,
}: {
  scrollRef: RefObject<HTMLDivElement | null>;
  shellRef: RefObject<HTMLDivElement | null>;
  theadRef: RefObject<HTMLTableSectionElement | null>;
  viewRange: GanttViewRange;
  compact: boolean;
  onPanPointerDown?: (event: ReactPointerEvent<HTMLDivElement>) => void;
  panActive?: boolean;
  scrollTitle?: string;
  dayGridOptions?: GanttDayGridOptions;
}) {
  const tCommon = useTranslations("admin.common");
  const locale = useLocale();
  const { compactChrome } = useCompactLayoutHints();
  const [state, setState] = useState<StickyViewportState>({
    active: false,
    left: 0,
    width: 0,
    roomColumnWidth: 0,
    daysContentWidth: 0,
    scrollLeft: 0,
  });
  const stickyActiveRef = useRef(false);
  const mainDaysInnerRef = useRef<HTMLDivElement>(null);
  const scrollLeftRef = useRef(0);

  useEffect(() => {
    const scrollEl = scrollRef.current;
    const shell = shellRef.current;
    const thead = theadRef.current;
    if (!scrollEl || !shell || !thead) return;

    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const scrollRect = scrollEl.getBoundingClientRect();
        const shellRect = shell.getBoundingClientRect();
        const theadRect = thead.getBoundingClientRect();
        const roomHeader =
          thead.querySelector<HTMLTableCellElement>(".gantt-head-main-row__room");
        const roomColumnWidth = roomHeader?.getBoundingClientRect().width ?? 0;
        const daysContentWidth = Math.max(0, scrollEl.scrollWidth - roomColumnWidth);
        const stickyOn = stickyActiveRef.current
          ? theadRect.top <= 4
          : theadRect.top <= -4;
        const active =
          stickyOn && shellRect.bottom > Math.max(theadRect.height, 1);
        stickyActiveRef.current = active;
        const scrollLeft = scrollEl.scrollLeft;
        if (scrollLeft !== scrollLeftRef.current) {
          scrollLeftRef.current = scrollLeft;
          if (mainDaysInnerRef.current) {
            mainDaysInnerRef.current.style.transform = `translateX(-${scrollLeft}px)`;
          }
        }

        const next: StickyViewportState = {
          active,
          left: scrollRect.left,
          width: scrollRect.width,
          roomColumnWidth,
          daysContentWidth,
          scrollLeft,
        };

        setState((prev) =>
          prev.active === next.active &&
          prev.left === next.left &&
          prev.width === next.width &&
          prev.roomColumnWidth === next.roomColumnWidth &&
          prev.daysContentWidth === next.daysContentWidth
            ? prev
            : { ...next, scrollLeft: prev.scrollLeft }
        );
      });
    };

    update();
    scrollEl.addEventListener("scroll", update, { passive: true });
    window.addEventListener("scroll", update, { passive: true });
    const scheduleLayout = debounce(update, LAYOUT_RESIZE_DEBOUNCE_MS);
    window.addEventListener("resize", scheduleLayout, { passive: true });
    window.addEventListener("orientationchange", scheduleLayout, { passive: true });
    window.visualViewport?.addEventListener("resize", scheduleLayout, {
      passive: true,
    });
    window.visualViewport?.addEventListener("scroll", update, { passive: true });

    return () => {
      cancelAnimationFrame(frame);
      scrollEl.removeEventListener("scroll", update);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", scheduleLayout);
      window.removeEventListener("orientationchange", scheduleLayout);
      window.visualViewport?.removeEventListener("resize", scheduleLayout);
      window.visualViewport?.removeEventListener("scroll", update);
    };
  }, [scrollRef, shellRef, theadRef, viewRange.periodKey, compact]);

  if (
    compactChrome ||
    !state.active ||
    state.width <= 0 ||
    state.daysContentWidth <= 0 ||
    state.roomColumnWidth <= 0
  ) {
    return null;
  }

  return (
    <AdminPortal>
      <div
        className="gantt-viewport-header gantt-viewport-header--calendar"
        style={{ left: state.left, width: state.width }}
        aria-hidden={false}
      >
        <div className="gantt-viewport-header__row gantt-viewport-header__row--main">
          <div
            className="gantt-head-main-row__room gantt-room-column-header gantt-viewport-header__room"
            style={{ width: state.roomColumnWidth }}
          >
            {tCommon("room")}
          </div>
          <div className="gantt-viewport-header__days-viewport">
            <div
              ref={mainDaysInnerRef}
              className="gantt-viewport-header__days-inner"
              style={{
                width: state.daysContentWidth,
                transform: `translateX(-${scrollLeftRef.current}px)`,
              }}
            >
              <div className="gantt-head-main-row__days">
                <GanttDayHeader
                  columns={viewRange.days}
                  compact={compact}
                  onPanPointerDown={onPanPointerDown}
                  panActive={panActive}
                  scrollTitle={scrollTitle ?? tCommon("scrollDrag")}
                  todayLabel={tCommon("todayPanel")}
                  locale={locale}
                  dayGridOptions={dayGridOptions}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminPortal>
  );
}
