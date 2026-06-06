"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

type Props = {
  cereriCount: number;
  arrivalsCount: number;
  departuresCount: number;
  cleanCount: number;
};

/**
 * Today board badges + action buttons with reveal/collapse animation.
 *
 * Default state: shows 4 badges (new, in, out, clean).
 * Reveal: arrow → badges slide out right, action buttons slide in from left.
 * Collapse: buttons slide out right, badges slide back in.
 */
export function AdminTodayNotifications({
  cereriCount,
  arrivalsCount,
  departuresCount,
  cleanCount,
}: Props) {
  const t = useTranslations("admin.common");
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="admin-today-bar">
      {/* Badges layer — visible when collapsed */}
      <div
        className={[
          "admin-today-bar__badges",
          expanded && "admin-today-bar__badges--hidden",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <span
          className={[
            "admin-today-badge admin-today-badge--new",
            cereriCount <= 0 && "admin-today-badge--idle",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <strong>{cereriCount}</strong> {t("newShort")}
        </span>
        <span className="admin-today-badge admin-today-badge--in">
          <strong>{arrivalsCount}</strong> {t("arrivalsShort")}
        </span>
        <span className="admin-today-badge admin-today-badge--out">
          <strong>{departuresCount}</strong> {t("departuresShort")}
        </span>
        <span className="admin-today-badge admin-today-badge--clean">
          <strong>{cleanCount}</strong> {t("toCleanShort")}
        </span>
      </div>

      {/* Action buttons layer — visible when expanded */}
      <div
        className={[
          "admin-today-bar__actions",
          expanded && "admin-today-bar__actions--visible",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <Link
          href="/admin/bookings"
          className="admin-today-action admin-today-action--new"
          style={{ transitionDelay: "0ms" }}
        >
          {t("newShort")} ({cereriCount})
        </Link>
        <Link
          href="/admin/cazari"
          className="admin-today-action admin-today-action--in"
          style={{ transitionDelay: "40ms" }}
        >
          Check-in ({arrivalsCount})
        </Link>
        <Link
          href="/admin/cazari?tab=departures"
          className="admin-today-action admin-today-action--out"
          style={{ transitionDelay: "80ms" }}
        >
          Check-out ({departuresCount})
        </Link>
        <Link
          href="/admin/cazari?tab=clean"
          className="admin-today-action admin-today-action--clean"
          style={{ transitionDelay: "120ms" }}
        >
          {t("toCleanShort")} ({cleanCount})
        </Link>
      </div>

      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className={[
          "admin-today-bar__toggle",
          expanded && "admin-today-bar__toggle--expanded",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-label={expanded ? t("collapse") : t("expand")}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </div>
  );
}
