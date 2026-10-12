"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { submitGuestGreenStayAction } from "@/features/guest-app/actions/stay";
import { addDays } from "@/lib/stay-dates";
import { useGuestAppToast } from "@/features/guest-app/GuestAppToast";

type Props = {
  accessCode: string;
  description?: string;
  today: string;
  checkIn: string;
  checkOut: string;
  pendingDates: string[];
};

function formatGuestDate(iso: string, locale: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return iso;
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
  }).format(new Date(year, month - 1, day));
}

export function GuestGreenStayForm({
  accessCode,
  description,
  today,
  checkIn,
  checkOut,
  pendingDates,
}: Props) {
  const t = useTranslations("guestApp.greenStay");
  const locale = useLocale();
  const { showToast } = useGuestAppToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const lastNight = addDays(checkOut, -1);
  const earliest = today > checkIn ? today : checkIn;
  const canRequest = earliest <= lastNight;
  const defaultDate = addDays(today, 1);
  const initialDate =
    defaultDate >= earliest && defaultDate <= lastNight ? defaultDate : earliest;
  const [skipDate, setSkipDate] = useState(initialDate);
  const [note, setNote] = useState("");

  if (done) {
    return <div className="guest-app__success-box">{t("success")}</div>;
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await submitGuestGreenStayAction({
        accessCode,
        skipDate,
        note,
      });
      if (!result.ok) {
        const key = result.error as "errors.generic";
        setError(t.has(key) ? t(key) : result.error);
        return;
      }
      showToast(t("success"));
      setDone(true);
    });
  }

  return (
    <form className="guest-app__form space-y-4" onSubmit={handleSubmit}>
      {description ? (
        <p className="guest-app__subtle text-sm leading-relaxed">{description}</p>
      ) : null}

      {pendingDates.length > 0 ? (
        <div className="guest-app__panel guest-app__subtle text-sm">
          <p className="font-semibold">{t("pendingTitle")}</p>
          <ul className="mt-2 list-disc pl-5">
            {pendingDates.map((date) => (
              <li key={date}>{formatGuestDate(date, locale)}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {canRequest ? (
        <>
          <label className="guest-app__field">
            <span className="guest-app__field__label">{t("skipDate")}</span>
            <input
              className="guest-app__field__input"
              type="date"
              required
              min={earliest}
              max={lastNight}
              value={skipDate}
              onChange={(e) => setSkipDate(e.target.value)}
            />
          </label>
          <label className="guest-app__field">
            <span className="guest-app__field__label">{t("note")}</span>
            <textarea
              className="guest-app__field__input"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          {error ? <p className="guest-app__form-error">{error}</p> : null}
          <button type="submit" className="guest-app__btn-primary" disabled={pending}>
            {pending ? t("submitting") : t("submit")}
          </button>
        </>
      ) : (
        <p className="guest-app__subtle text-sm">{t("outsideStay")}</p>
      )}
    </form>
  );
}
