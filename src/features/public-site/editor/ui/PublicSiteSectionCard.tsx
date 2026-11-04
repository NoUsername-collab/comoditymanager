"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

/** One block of the homepage: show/hide, move, and open to edit its text in place. */
export function PublicSiteSectionCard({
  editKey,
  name,
  description,
  summary,
  open,
  onToggleOpen,
  visible,
  onToggleVisible,
  onMoveUp,
  onMoveDown,
  pinned,
  children,
}: {
  /** Stable id the preview uses to open this card. */
  editKey: string;
  name: string;
  description: string;
  summary?: string;
  open: boolean;
  onToggleOpen: () => void;
  /** Omit for blocks that are always shown. */
  visible?: boolean;
  onToggleVisible?: (visible: boolean) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  /** Fixed position label for blocks that cannot move. */
  pinned?: "top" | "bottom";
  children: ReactNode;
}) {
  const t = useTranslations("admin.pages.publicSite.editor");
  const hidden = visible === false;
  const movable = onMoveUp !== undefined || onMoveDown !== undefined;

  return (
    <li
      className="pub-editor-card"
      data-edit-key={editKey}
      data-open={open ? "1" : undefined}
      data-hidden={hidden ? "1" : undefined}
    >
      <div className="pub-editor-card__row">
        <button
          type="button"
          className="pub-editor-card__main"
          aria-expanded={open}
          onClick={onToggleOpen}
        >
          <span className="pub-editor-card__name">{name}</span>
          <span className="pub-editor-card__desc">
            {hidden ? t("hiddenOnSite") : (summary ?? description)}
          </span>
        </button>

        <div className="pub-editor-card__tools">
          {pinned ? (
            <span className="pub-editor-card__pin">
              {t(pinned === "top" ? "pinnedTop" : "pinnedBottom")}
            </span>
          ) : null}
          {movable ? (
            <>
              <button
                type="button"
                className="pub-editor-card__icon"
                aria-label={t("moveUp", { name })}
                title={t("moveUp", { name })}
                disabled={!onMoveUp}
                onClick={onMoveUp}
              >
                ↑
              </button>
              <button
                type="button"
                className="pub-editor-card__icon"
                aria-label={t("moveDown", { name })}
                title={t("moveDown", { name })}
                disabled={!onMoveDown}
                onClick={onMoveDown}
              >
                ↓
              </button>
            </>
          ) : null}
          {onToggleVisible ? (
            <button
              type="button"
              className="pub-editor-card__eye"
              aria-pressed={!hidden}
              aria-label={t(hidden ? "showAria" : "hideAria", { name })}
              onClick={() => onToggleVisible(hidden)}
            >
              {hidden ? t("hidden") : t("shown")}
            </button>
          ) : null}
        </div>
      </div>

      {open ? (
        <div className="pub-editor-card__body">
          {children}
          <button type="button" className="pub-editor-card__done" onClick={onToggleOpen}>
            {t("done")}
          </button>
        </div>
      ) : null}
    </li>
  );
}
