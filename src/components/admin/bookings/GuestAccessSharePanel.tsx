"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  loadGuestAccessLinkAction,
  regenerateGuestAccessAction,
  sendGuestAppLinkEmailAction,
} from "@/app/[locale]/admin/(panel)/bookings/guest-app-actions";

type Props = {
  bookingId: string;
  guestEmail: string | null;
  isConfirmed: boolean;
};

export function GuestAccessSharePanel({
  bookingId,
  guestEmail,
  isConfirmed,
}: Props) {
  const t = useTranslations("admin.pages.guestApp.share");
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!isConfirmed) return;
    startTransition(async () => {
      const res = await loadGuestAccessLinkAction(bookingId);
      if (res.ok) {
        setUrl(res.url);
        setError(null);
      } else {
        setError(res.error);
      }
    });
  }, [bookingId, isConfirmed]);

  if (!isConfirmed) return null;

  function copyUrl() {
    if (!url) return;
    void navigator.clipboard.writeText(url).then(() => {
      setMessage(t("copied"));
      window.setTimeout(() => setMessage(null), 2000);
    });
  }

  function regenerate() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const res = await regenerateGuestAccessAction(bookingId);
      if (res.ok) {
        setUrl(res.url);
        setMessage(t("regenerated"));
      } else {
        setError(res.error);
      }
    });
  }

  function sendEmail() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const res = await sendGuestAppLinkEmailAction(bookingId);
      if (res.ok) {
        setMessage(t("emailSent"));
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="bd-card">
      <p className="bd-card__title">{t("title")}</p>
      <p className="mb-3 text-xs text-zinc-500">{t("hint")}</p>

      {pending && !url ? (
        <p className="text-sm text-zinc-500">{t("loading")}</p>
      ) : null}

      {url ? (
        <div className="space-y-2">
          <input
            readOnly
            value={url}
            className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-800"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white"
              onClick={copyUrl}
            >
              {t("copy")}
            </button>
            <button
              type="button"
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700"
              onClick={regenerate}
              disabled={pending}
            >
              {t("regenerate")}
            </button>
            {guestEmail ? (
              <button
                type="button"
                className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800"
                onClick={sendEmail}
                disabled={pending}
              >
                {t("sendEmail")}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {message ? (
        <p className="mt-2 text-xs text-emerald-700">{message}</p>
      ) : null}
      {error ? (
        <p className="mt-2 text-xs text-red-600">{error}</p>
      ) : null}
    </div>
  );
}
