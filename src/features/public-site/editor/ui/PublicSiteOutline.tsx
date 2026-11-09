"use client";

import { useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { useTranslations } from "next-intl";

/**
 * The page outline: one compact row per part of the page, in page order. A row
 * opens its editor on its own screen; movable rows drag (or move with the arrow
 * keys on their handle), and the eye shows or hides them on the site.
 */
export function OutlineGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="pub-outline">
      <h3 className="pub-outline__title">{title}</h3>
      <ol className="pub-outline__list">{children}</ol>
    </section>
  );
}

export type OutlineDrag = {
  /** Key of the row being dragged, shared by the rows of one list. */
  dragging: string | null;
  /** Key of the row it would land on. */
  over: string | null;
  /** Pointer handlers for a row's handle: mouse, touch and pen alike. */
  handleProps: (key: string) => {
    onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
    onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void;
    onPointerUp: (event: ReactPointerEvent<HTMLElement>) => void;
    onPointerCancel: () => void;
  };
  onMove: (key: string, direction: -1 | 1) => void;
};

/** Edge of the scrolling editor column where a drag scrolls it. */
const AUTO_SCROLL_EDGE = 56;

/**
 * Drag state for one list of rows. It runs on pointer events, not HTML drag and
 * drop, which Android browsers lack and iPhones only half support, so reordering
 * works with a finger as it does with a mouse.
 */
export function useOutlineDrag(
  onDrop: (key: string, targetKey: string) => void,
  onMove: OutlineDrag["onMove"],
): OutlineDrag {
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);

  function targetAt(x: number, y: number, key: string): string | null {
    const row = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-drag-target]");
    const target = row?.dataset.editKey ?? null;
    return target && target !== key ? target : null;
  }

  return {
    dragging,
    over,
    onMove,
    handleProps: (key) => ({
      onPointerDown: (event) => {
        if (event.pointerType === "mouse" && event.button !== 0) return;
        event.preventDefault();
        try {
          // Keeps the moves coming to this handle while the finger leaves it.
          event.currentTarget.setPointerCapture(event.pointerId);
        } catch {
          /* the pointer is already gone */
        }
        setDragging(key);
        setOver(null);
      },
      onPointerMove: (event) => {
        if (dragging !== key) return;
        setOver(targetAt(event.clientX, event.clientY, key));
        // Near the top or bottom of the editor column, scroll it to reach far rows.
        const column = event.currentTarget.closest(".pub-site-studio__form");
        if (!column) return;
        const box = column.getBoundingClientRect();
        if (event.clientY < box.top + AUTO_SCROLL_EDGE) column.scrollBy(0, -12);
        else if (event.clientY > box.bottom - AUTO_SCROLL_EDGE) column.scrollBy(0, 12);
      },
      onPointerUp: (event) => {
        if (dragging !== key) return;
        const target = targetAt(event.clientX, event.clientY, key) ?? over;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
        setDragging(null);
        setOver(null);
        if (target) onDrop(key, target);
      },
      onPointerCancel: () => {
        setDragging(null);
        setOver(null);
      },
    }),
  };
}

export function OutlineRow({
  rowKey,
  name,
  summary,
  visible,
  onToggleVisible,
  onOpen,
  drag,
  pinned,
}: {
  rowKey: string;
  name: string;
  summary?: string;
  /** Undefined for parts that are always shown. */
  visible?: boolean;
  onToggleVisible?: (visible: boolean) => void;
  onOpen: () => void;
  /** Present for rows the operator can move. */
  drag?: OutlineDrag;
  /** Fixed place on the page, shown instead of the drag handle. */
  pinned?: "top" | "bottom";
}) {
  const t = useTranslations("admin.pages.publicSite.editor");
  const hidden = visible === false;

  return (
    <li
      className="pub-outline__row"
      data-edit-key={rowKey}
      data-drag-target={drag ? "1" : undefined}
      data-hidden={hidden ? "1" : undefined}
      data-dragging={drag?.dragging === rowKey ? "1" : undefined}
      data-over={drag && drag.dragging && drag.over === rowKey ? "1" : undefined}
    >
      {drag ? (
        <button
          type="button"
          className="pub-outline__handle"
          aria-label={t("dragHandle", { name })}
          title={t("dragHandle", { name })}
          {...drag.handleProps(rowKey)}
          onKeyDown={(event) => {
            if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
            event.preventDefault();
            drag.onMove(rowKey, event.key === "ArrowUp" ? -1 : 1);
          }}
        >
          <span aria-hidden>⋮⋮</span>
        </button>
      ) : (
        <span
          className="pub-outline__pin"
          title={pinned ? t(pinned === "top" ? "pinnedTop" : "pinnedBottom") : undefined}
          aria-hidden
        />
      )}

      <button type="button" className="pub-outline__open" onClick={onOpen}>
        <span className="pub-outline__name">{name}</span>
        <span className="pub-outline__summary">{hidden ? t("hiddenOnSite") : summary}</span>
      </button>

      {onToggleVisible ? (
        <button
          type="button"
          className="pub-outline__eye"
          aria-pressed={!hidden}
          aria-label={t(hidden ? "showAria" : "hideAria", { name })}
          title={t(hidden ? "showAria" : "hideAria", { name })}
          onClick={() => onToggleVisible(hidden)}
        >
          <EyeIcon open={!hidden} />
        </button>
      ) : null}
    </li>
  );
}

function EyeIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
      {open ? null : <path d="M4 4l16 16" />}
    </svg>
  );
}

/** One part of the page opened on its own screen, with the way back to the outline. */
export function OutlineDetail({
  name,
  description,
  visible,
  onToggleVisible,
  onBack,
  children,
}: {
  name: string;
  description: string;
  visible?: boolean;
  onToggleVisible?: (visible: boolean) => void;
  onBack: () => void;
  children: ReactNode;
}) {
  const t = useTranslations("admin.pages.publicSite.editor");
  const hidden = visible === false;
  return (
    <div className="pub-outline-detail">
      <button type="button" className="pub-outline-detail__back" onClick={onBack}>
        ← {t("backToPage")}
      </button>
      <header className="pub-outline-detail__head">
        <div>
          <h3>{name}</h3>
          <p>{description}</p>
        </div>
        {onToggleVisible ? (
          <button
            type="button"
            className="pub-outline__eye pub-outline__eye--labelled"
            aria-pressed={!hidden}
            onClick={() => onToggleVisible(hidden)}
          >
            <EyeIcon open={!hidden} />
            <span>{hidden ? t("hidden") : t("shown")}</span>
          </button>
        ) : null}
      </header>
      <div className="pub-outline-detail__body">{children}</div>
    </div>
  );
}
