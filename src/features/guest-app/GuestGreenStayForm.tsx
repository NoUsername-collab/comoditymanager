"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { submitGuestGreenStayAction } from "@/app/[locale]/(guest-app)/stay/[code]/actions";
import { addDays } from "@/lib/stay-dates";

type Props = {
  accessCode: string;
  description?: string;
  today: string;
  pendingDates: string[];
};

export function GuestGreenStayForm({
  accessCode,
  description,
  today,
  pendingDates,
}: Props) {
  const t = useTranslations("guestApp.greenStay");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const defaultDate = addDays(today, 1);
  const [skipDate, setSkipDate] = useState(defaultDate);
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
              <li key={date}>{date}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <label className="guest-app__field">
        <span className="guest-app__field__label">{t("skipDate")}</span>
        <input
          className="guest-app__field__input"
          type="date"
          required
          min={today}
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
    </form>
  );
}
