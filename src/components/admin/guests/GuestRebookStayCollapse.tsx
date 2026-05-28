"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { GuestRebookStayForm } from "@/components/admin/guests/GuestRebookStayForm";
import { loadGuestRebookPanelAction } from "@/app/[locale]/admin/(panel)/guests/rebook-actions";
import type { GuestRebookDraft } from "@/services/guest-rebook";
import type { ConfirmRoomOption } from "@/services/booking-confirm";

export type GuestRebookPanelPayload = {
  draft: GuestRebookDraft;
  initialRooms: ConfirmRoomOption[];
  initialCanFulfill: boolean;
  initialMinRooms: number;
  checkInTime: string;
  checkOutTime: string;
};

type Props = {
  guestId: string;
  bookingId: string;
  compact?: boolean;
  initialPayload?: GuestRebookPanelPayload | null;
  /** Simulated or real today (YYYY-MM-DD) for date inputs. */
  today?: string;
};

export function GuestRebookStayCollapse({
  guestId,
  bookingId,
  compact = false,
  initialPayload = null,
  today,
}: Props) {
  const tPage = useTranslations("admin.pages.guestDetail");
  const tRebook = useTranslations("admin.pages.guestRebook");
  const tCommon = useTranslations("admin.common");

  const [open, setOpen] = useState(false);
  const [payload, setPayload] = useState<GuestRebookPanelPayload | null>(
    initialPayload
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pending, startLoad] = useTransition();

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && !payload && !pending) {
      startLoad(async () => {
        setLoadError(null);
        const res = await loadGuestRebookPanelAction(guestId, bookingId);
        if (!res.ok) {
          setLoadError(tCommon("genericError"));
          return;
        }
        setPayload(res.data);
      });
    }
  }

  function close() {
    setOpen(false);
  }

  const panelId = `guest-rebook-${bookingId}`;

  return (
    <div
      className={[
        "guest-rebook-collapse",
        compact && "guest-rebook-collapse--compact",
        open && "guest-rebook-collapse--open",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <button
        type="button"
        className="guest-rebook-collapse__trigger"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={toggle}
      >
        <span>{tPage("rebookStay")}</span>
        <span className="guest-rebook-collapse__chevron" aria-hidden>
          {open ? "▾" : "▸"}
        </span>
      </button>

      <div
        id={panelId}
        className="guest-rebook-collapse__panel"
        hidden={!open}
        role="region"
        aria-label={tRebook("title")}
      >
        {open && pending && !payload && (
          <p className="guest-rebook-collapse__loading">{tCommon("loading")}</p>
        )}
        {open && loadError && (
          <p className="guest-rebook-collapse__error" role="alert">
            {loadError}
          </p>
        )}
        {open && payload && (
          <GuestRebookStayForm
            embedded
            compact={compact}
            today={today}
            draft={payload.draft}
            initialRooms={payload.initialRooms}
            initialCanFulfill={payload.initialCanFulfill}
            initialMinRooms={payload.initialMinRooms}
            checkInTime={payload.checkInTime}
            checkOutTime={payload.checkOutTime}
            onCancel={close}
          />
        )}
      </div>
    </div>
  );
}
