"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { GuestListItem } from "@/domain/guest/types";
import { GuestListCard } from "@/components/admin/guests/GuestListCard";
import {
  guestListPreviewHref,
  guestProfileHref,
} from "@/lib/guest-list-links";

type Props = {
  title: string;
  description: string;
  guests: GuestListItem[];
  currentHref: string;
  emptyLabel: string;
  collapsedPreviewCount?: number;
  defaultCollapsed?: boolean;
};

export function GuestCollapsibleSection({
  title,
  description,
  guests,
  currentHref,
  emptyLabel,
  collapsedPreviewCount = 3,
  defaultCollapsed = true,
}: Props) {
  const t = useTranslations("admin.pages.guests");
  const [open, setOpen] = useState(!defaultCollapsed);

  const visible = open ? guests : guests.slice(0, collapsedPreviewCount);
  const hiddenCount = Math.max(0, guests.length - visible.length);

  return (
    <section
      className={[
        "guest-section guest-surface guest-section--collapsible",
        !open && guests.length > collapsedPreviewCount && "guest-section--collapsed",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <button
        type="button"
        className="guest-section__header guest-section__header--toggle"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <div className="guest-section__header-text">
          <h2 className="guest-section__title">{title}</h2>
          <p className="guest-section__desc">{description}</p>
        </div>
        <div className="guest-section__header-actions">
          <span className="guest-section__count" aria-live="polite">
            {t("guestsCount", { count: guests.length })}
          </span>
          <span className="guest-section__chevron" aria-hidden>
            {open ? "▾" : "▸"}
          </span>
        </div>
      </button>

      {guests.length === 0 ? (
        <p className="guest-section__empty">{emptyLabel}</p>
      ) : (
        <>
          <ul className="guest-grid guest-grid--compact">
            {visible.map((guest) => (
              <GuestListCard
                key={guest.id}
                guest={guest}
                previewHref={guestListPreviewHref(currentHref, guest.id)}
                profileHref={guestProfileHref(currentHref, guest.id)}
              />
            ))}
          </ul>
          {!open && hiddenCount > 0 && (
            <button
              type="button"
              className="guest-section__expand"
              onClick={() => setOpen(true)}
            >
              {t("expandSection", { count: hiddenCount })}
            </button>
          )}
          {open && guests.length > collapsedPreviewCount && (
            <button
              type="button"
              className="guest-section__expand guest-section__expand--collapse"
              onClick={() => setOpen(false)}
            >
              {t("collapseSection")}
            </button>
          )}
        </>
      )}
    </section>
  );
}
