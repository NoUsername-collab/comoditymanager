"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  addDays,
  clampCheckInDate,
  stayNightCount,
  todayIso,
} from "@/lib/stay-dates";

type Props = {
  bookingId: string;
  checkIn: string;
  checkOut: string;
  numAdults: number;
  numChildren: number;
  editable: boolean;
  /** Guest already checked in — only allow checkout date changes */
  checkedIn?: boolean;
  editAction: (formData: FormData) => Promise<{ ok: boolean; error?: string }>;
};

export function BookingStayEditor({
  bookingId,
  checkIn: initialCheckIn,
  checkOut: initialCheckOut,
  numAdults: initialAdults,
  numChildren: initialChildren,
  editable,
  checkedIn = false,
  editAction,
}: Props) {
  const t = useTranslations("admin.stayEditor");
  const today = todayIso();
  const [editing, setEditing] = useState(false);
  const [checkIn, setCheckIn] = useState(initialCheckIn);
  const [checkOut, setCheckOut] = useState(initialCheckOut);
  const [numAdults, setNumAdults] = useState(initialAdults);
  const [numChildren, setNumChildren] = useState(initialChildren);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const nights = stayNightCount(checkIn, checkOut);
  const hasChanges =
    checkIn !== initialCheckIn ||
    checkOut !== initialCheckOut ||
    numAdults !== initialAdults ||
    numChildren !== initialChildren;

  function handleCancel() {
    setCheckIn(initialCheckIn);
    setCheckOut(initialCheckOut);
    setNumAdults(initialAdults);
    setNumChildren(initialChildren);
    setError(null);
    setEditing(false);
  }

  function handleSave() {
    if (nights < 1) {
      setError(t("minOneNight"));
      return;
    }
    setError(null);
    setSaved(false);

    const fd = new FormData();
    fd.set("id", bookingId);
    fd.set("check_in", checkIn);
    fd.set("check_out", checkOut);
    fd.set("num_adults", String(numAdults));
    fd.set("num_children", String(numChildren));

    startTransition(async () => {
      const result = await editAction(fd);
      if (result.ok) {
        setSaved(true);
        setEditing(false);
        setTimeout(() => setSaved(false), 3000);
      } else {
        setError(result.error ?? t("saveFailed"));
      }
    });
  }

  if (!editing) {
    return (
      <span className="bd-stay-inline">
        {editable && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="bd-stay__edit-btn"
          >
            {checkedIn ? t("editCheckout") : t("editDates")}
          </button>
        )}
        {saved && (
          <span className="bd-stay__saved">{t("saved")}</span>
        )}
      </span>
    );
  }

  return (
    <div className="admin-stay-editor">
      {checkedIn && (
        <p className="admin-stay-editor__checked-in-hint">
          {t("checkedInHint")}
        </p>
      )}
      <div className="admin-stay-editor__grid">
        <label className={`admin-stay-editor__field ${checkedIn ? "admin-stay-editor__field--locked" : ""}`}>
          <span className="admin-stay-editor__label">{t("checkIn")}</span>
          <input
            type="date"
            value={checkIn}
            disabled={checkedIn}
            min={checkedIn ? undefined : today}
            onChange={(e) => {
              const nextCheckIn = clampCheckInDate(e.target.value, today);
              setCheckIn(nextCheckIn);
              if (nextCheckIn >= checkOut) {
                setCheckOut(addDays(nextCheckIn, 1));
              }
            }}
            className="admin-stay-editor__input"
          />
        </label>
        <label className="admin-stay-editor__field">
          <span className="admin-stay-editor__label">{t("checkOut")}</span>
          <input
            type="date"
            value={checkOut}
            min={checkIn}
            onChange={(e) => setCheckOut(e.target.value)}
            className="admin-stay-editor__input"
          />
        </label>
        <label className={`admin-stay-editor__field ${checkedIn ? "admin-stay-editor__field--locked" : ""}`}>
          <span className="admin-stay-editor__label">{t("adults")}</span>
          <input
            type="number"
            min={1}
            value={numAdults}
            disabled={checkedIn}
            onChange={(e) => setNumAdults(Math.max(1, Number(e.target.value) || 1))}
            className="admin-stay-editor__input"
          />
        </label>
        <label className={`admin-stay-editor__field ${checkedIn ? "admin-stay-editor__field--locked" : ""}`}>
          <span className="admin-stay-editor__label">{t("children")}</span>
          <input
            type="number"
            min={0}
            value={numChildren}
            disabled={checkedIn}
            onChange={(e) => setNumChildren(Math.max(0, Number(e.target.value) || 0))}
            className="admin-stay-editor__input"
          />
        </label>
      </div>

      {nights > 0 && (
        <p className="admin-stay-editor__summary">
          {nights} {nights === 1 ? t("nightSingular") : t("nightPlural")} · {numAdults + numChildren} {t("personsTotal")}
        </p>
      )}

      {error && <p className="admin-stay-editor__error">{error}</p>}

      <div className="admin-stay-editor__actions">
        <button
          type="button"
          onClick={handleCancel}
          disabled={pending}
          className="admin-stay-editor__cancel"
        >
          {t("cancel")}
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={pending || !hasChanges || nights < 1}
          className="admin-stay-editor__save"
        >
          {pending ? t("saving") : t("saveDates")}
        </button>
      </div>
    </div>
  );
}
