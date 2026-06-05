"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { stayNightCount } from "@/lib/stay-dates";

type Props = {
  bookingId: string;
  checkIn: string;
  checkOut: string;
  numAdults: number;
  numChildren: number;
  editable: boolean;
  editAction: (formData: FormData) => Promise<{ ok: boolean; error?: string }>;
};

export function BookingStayEditor({
  bookingId,
  checkIn: initialCheckIn,
  checkOut: initialCheckOut,
  numAdults: initialAdults,
  numChildren: initialChildren,
  editable,
  editAction,
}: Props) {
  const t = useTranslations("admin.stayEditor");
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
      <div className="admin-stay-display">
        <div className="admin-stay-display__grid">
          <div>
            <span className="admin-stay-display__label">{t("checkIn")}</span>
            <span className="admin-stay-display__value">{checkIn}</span>
          </div>
          <div>
            <span className="admin-stay-display__label">{t("checkOut")}</span>
            <span className="admin-stay-display__value">{checkOut}</span>
          </div>
          <div>
            <span className="admin-stay-display__label">{t("nights")}</span>
            <span className="admin-stay-display__value">{nights}</span>
          </div>
          <div>
            <span className="admin-stay-display__label">{t("guests")}</span>
            <span className="admin-stay-display__value">
              {numAdults}A {numChildren > 0 ? `+ ${numChildren}C` : ""}
            </span>
          </div>
        </div>
        {editable && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="admin-stay-display__edit-btn"
          >
            {t("editDates")}
          </button>
        )}
        {saved && (
          <p className="mt-2 text-xs font-medium text-emerald-600">{t("saved")}</p>
        )}
      </div>
    );
  }

  return (
    <div className="admin-stay-editor">
      <div className="admin-stay-editor__grid">
        <label className="admin-stay-editor__field">
          <span className="admin-stay-editor__label">{t("checkIn")}</span>
          <input
            type="date"
            value={checkIn}
            onChange={(e) => {
              setCheckIn(e.target.value);
              if (e.target.value >= checkOut) {
                const d = new Date(e.target.value);
                d.setDate(d.getDate() + 1);
                setCheckOut(d.toISOString().slice(0, 10));
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
        <label className="admin-stay-editor__field">
          <span className="admin-stay-editor__label">{t("adults")}</span>
          <input
            type="number"
            min={1}
            value={numAdults}
            onChange={(e) => setNumAdults(Math.max(1, Number(e.target.value) || 1))}
            className="admin-stay-editor__input"
          />
        </label>
        <label className="admin-stay-editor__field">
          <span className="admin-stay-editor__label">{t("children")}</span>
          <input
            type="number"
            min={0}
            value={numChildren}
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
