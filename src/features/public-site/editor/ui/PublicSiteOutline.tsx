"use client";

import { useState, type ReactNode } from "react";
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
  setDragging: (key: string | null) => void;
  onDrop: (key: string, targetKey: string) => void;
  onMove: (key: string, direction: -1 | 1) => void;
};

/** Drag state for one list of rows. */
export function useOutlineDrag(
  onDrop: OutlineDrag["onDrop"],
  onMove: OutlineDrag["onMove"],
): OutlineDrag {
  const [dragging, setDragging] = useState<string | null>(null);
  return { dragging, setDragging, onDrop, onMove };
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
  const [over, setOver] = useState(false);
  const hidden = visible === false;

  return (
    <li
      className="pub-outline__row"
      data-edit-key={rowKey}
      data-hidden={hidden ? "1" : undefined}
      data-dragging={drag?.dragging === rowKey ? "1" : undefined}
      data-over={over ? "1" : undefined}
      onDragOver={
        drag
          ? (event) => {
              if (!drag.dragging || drag.dragging === rowKey) return;
              event.preventDefault();
              setOver(true);
            }
          : undefined
      }
      onDragLeave={drag ? () => setOver(false) : undefined}
      onDrop={
        drag
          ? (event) => {
              event.preventDefault();
              setOver(false);
              if (drag.dragging && drag.dragging !== rowKey) drag.onDrop(drag.dragging, rowKey);
              drag.setDragging(null);
            }
          : undefined
      }
    >
      {drag ? (
        <button
          type="button"
          className="pub-outline__handle"
          draggable
          aria-label={t("dragHandle", { name })}
          title={t("dragHandle", { name })}
          onDragStart={(event) => {
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/plain", rowKey);
            drag.setDragging(rowKey);
          }}
          onDragEnd={() => drag.setDragging(null)}
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
