"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { useTranslations } from "next-intl";
import { AdminPortal } from "@/components/admin/overlay/AdminPortal";
import { computeFixedDropdownPosition } from "@/lib/ui/viewport-position";

type Props = {
  onOpenRequest: () => void;
  onOpenHold: () => void;
  onOpenMove: () => void;
  onOpenBlock: () => void;
  onOpenReception: () => void;
  /** Absent when nobody can be checked in right now. */
  onOpenCheckIn?: () => void;
  onOpenCheckOut?: () => void;
  /** Shows only requests on the Gantt; absent where the layer cannot change. */
  onToggleRequestsLayer?: () => void;
  requestsLayerActive?: boolean;
  requestCount?: number;
  arrivalsCount?: number;
  departuresCount?: number;
  cleanCount?: number;
};

type MenuPos = { top: number; left: number };

/** Rough menu size before the first measure (four items, ~11rem wide). */
const MENU_ESTIMATE = { width: 176, height: 168 };

const bold = (chunks: ReactNode) => <strong>{chunks}</strong>;

/**
 * Today on the Gantt toolbar: each count opens the work behind it, and one
 * split button creates. Nothing is hidden behind a reveal, so the bar keeps
 * the same width and the period navigation in the middle never moves.
 */
export function GanttTodayActions({
  onOpenRequest,
  onOpenHold,
  onOpenMove,
  onOpenBlock,
  onOpenReception,
  onOpenCheckIn,
  onOpenCheckOut,
  onToggleRequestsLayer,
  requestsLayerActive = false,
  requestCount = 0,
  arrivalsCount = 0,
  departuresCount = 0,
  cleanCount = 0,
}: Props) {
  const t = useTranslations("admin.gantt.radial");
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<MenuPos | null>(null);
  const splitRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const caretRef = useRef<HTMLButtonElement>(null);

  // The menu is portaled: on phones the toolbar scrolls sideways and would clip it.
  const positionMenu = useCallback(() => {
    const anchor = splitRef.current?.getBoundingClientRect();
    if (!anchor) return;
    const measured = menuRef.current?.getBoundingClientRect();
    const size = measured ? { width: measured.width, height: measured.height } : MENU_ESTIMATE;
    const pos = computeFixedDropdownPosition(anchor, size, { gap: 6 });
    setMenuPos((prev) => (prev && prev.top === pos.top && prev.left === pos.left ? prev : pos));
  }, []);

  useLayoutEffect(() => {
    if (menuOpen) positionMenu();
    else setMenuPos(null);
  }, [menuOpen, positionMenu]);

  useEffect(() => {
    if (!menuOpen) return;
    const onLayout = () => positionMenu();
    // Measure again once the portal has mounted the real menu.
    const raf = requestAnimationFrame(onLayout);
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (splitRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setMenuOpen(false);
    }
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
      caretRef.current?.focus();
    }
    window.addEventListener("resize", onLayout);
    window.addEventListener("scroll", onLayout, true);
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onLayout);
      window.removeEventListener("scroll", onLayout, true);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen, positionMenu]);

  // First item takes focus once the menu is placed, so arrows and Enter work at once.
  const placed = menuPos !== null;
  useEffect(() => {
    if (placed) menuRef.current?.querySelector<HTMLButtonElement>("[role='menuitem']")?.focus();
  }, [placed]);

  function onMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>("[role='menuitem']") ?? [],
    );
    const at = items.indexOf(document.activeElement as HTMLButtonElement);
    const step = event.key === "ArrowDown" ? 1 : -1;
    items[(at + step + items.length) % items.length]?.focus();
  }

  const menuItems = [
    { id: "request", label: t("requestTitle"), onClick: onOpenRequest },
    { id: "hold", label: t("holdTitle"), onClick: onOpenHold },
    { id: "block", label: t("blockTitle"), onClick: onOpenBlock },
    { id: "move", label: t("moveTitle"), onClick: onOpenMove, separated: true },
  ];

  return (
    <div className="gantt-action-strip" role="group" aria-label={t("todayAria")}>
      <button
        type="button"
        className={`gantt-action-strip__badge gantt-action-strip__badge--new ${requestCount > 0 && !requestsLayerActive ? "gantt-action-strip__badge--pulse" : ""} ${requestsLayerActive ? "gantt-action-strip__badge--active" : ""}`}
        onClick={onToggleRequestsLayer}
        disabled={!onToggleRequestsLayer || (requestCount === 0 && !requestsLayerActive)}
        aria-pressed={onToggleRequestsLayer ? requestsLayerActive : undefined}
        title={requestsLayerActive ? t("requestsHintActive") : t("requestsHint")}
      >
        {t.rich("requestsCount", { count: requestCount, b: bold })}
      </button>
      <button
        type="button"
        className="gantt-action-strip__badge gantt-action-strip__badge--in"
        onClick={onOpenCheckIn}
        disabled={!onOpenCheckIn}
        title={t("checkInTitle")}
      >
        {t.rich("arrivalsCount", { count: arrivalsCount, b: bold })}
      </button>
      <button
        type="button"
        className="gantt-action-strip__badge gantt-action-strip__badge--out"
        onClick={onOpenCheckOut}
        disabled={!onOpenCheckOut}
        title={t("checkOutTitle")}
      >
        {t.rich("departuresCount", { count: departuresCount, b: bold })}
      </button>
      <span
        className="gantt-action-strip__badge gantt-action-strip__badge--clean"
        title={t("cleanHint")}
      >
        {t.rich("cleanCount", { count: cleanCount, b: bold })}
      </span>

      <div ref={splitRef} className="gantt-action-strip__split">
        <button
          type="button"
          className="gantt-action-strip__btn gantt-action-strip__btn--primary"
          onClick={onOpenReception}
          title={t("bookingTitle")}
        >
          <span aria-hidden>+</span>
          {t("booking")}
        </button>
        <button
          ref={caretRef}
          type="button"
          className="gantt-action-strip__btn gantt-action-strip__btn--caret"
          onClick={() => setMenuOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-label={t("moreActions")}
          title={t("moreActions")}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>

      {menuOpen ? (
        <AdminPortal>
          <div
            ref={menuRef}
            className="gantt-action-strip__menu"
            role="menu"
            aria-label={t("moreActions")}
            onKeyDown={onMenuKeyDown}
            style={menuPos ? { top: menuPos.top, left: menuPos.left } : { visibility: "hidden" }}
          >
            {menuItems.map((item) => (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                className={`gantt-action-strip__menu-item ${item.separated ? "gantt-action-strip__menu-item--separated" : ""}`}
                onClick={() => {
                  setMenuOpen(false);
                  item.onClick();
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </AdminPortal>
      ) : null}
    </div>
  );
}
