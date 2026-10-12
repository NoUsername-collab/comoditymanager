"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { GUEST_RECEPTION_REQUEST_MAX } from "@/domain/guest-app/reception-request";
import type { GuestReceptionRequestSnapshot } from "@/domain/guest-app/reception-request";
import { submitGuestReceptionRequestAction } from "@/features/guest-app/actions/stay";
import { useGuestAppToast } from "@/features/guest-app/GuestAppToast";

type Props = {
  accessCode: string;
  requests: GuestReceptionRequestSnapshot[];
};

function formatSentAt(iso: string, locale: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function GuestReceptionRequestForm({ accessCode, requests }: Props) {
  const t = useTranslations("guestApp.receptionRequest");
  const locale = useLocale();
  const { showToast } = useGuestAppToast();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<GuestReceptionRequestSnapshot[]>(requests);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const trimmed = message.trim();
    startTransition(async () => {
      const result = await submitGuestReceptionRequestAction({
        accessCode,
        message: trimmed,
      });
      if (!result.ok) {
        const key = `errors.${result.error}` as "errors.generic";
        setError(t.has(key) ? t(key) : t("errors.generic"));
        return;
      }
      setSent((current) => [
        {
          id: `local-${Date.now()}`,
          message: trimmed,
          status: "pending",
          createdAt: new Date().toISOString(),
        },
        ...current,
      ]);
      setMessage("");
      showToast(t("sentToast"));
    });
  }

  return (
    <section id="reception-request" className="guest-app__request" aria-labelledby="guest-request-title">
      <h2 id="guest-request-title" className="guest-app__section-title">
        {t("title")}
      </h2>
      <p className="guest-app__subtle text-sm">{t("lead")}</p>
      <form className="guest-app__form space-y-3" onSubmit={handleSubmit}>
        <label className="guest-app__field">
          <span className="guest-app__field__label">{t("message")}</span>
          <textarea
            className="guest-app__field__input"
            rows={3}
            required
            minLength={2}
            maxLength={GUEST_RECEPTION_REQUEST_MAX}
            placeholder={t("placeholder")}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
          />
        </label>
        {error ? <p className="guest-app__form-error">{error}</p> : null}
        <button type="submit" className="guest-app__btn-primary" disabled={pending || message.trim().length < 2}>
          {pending ? t("submitting") : t("submit")}
        </button>
      </form>
      {sent.length > 0 ? (
        <ul className="guest-app__request-list">
          {sent.map((request) => (
            <li key={request.id} className="guest-app__request-item">
              <p>{request.message}</p>
              <p className="guest-app__request-item__meta">
                <span>{formatSentAt(request.createdAt, locale)}</span>
                <span>{request.status === "seen" ? t("seen") : t("pending")}</span>
              </p>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
