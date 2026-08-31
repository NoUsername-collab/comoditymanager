"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { AdminInput } from "@/components/admin/ui/AdminInput";
import {
  enableGuestAppFromOwnerAction,
  loadGuestAccessLinkAction,
  regenerateGuestAccessAction,
  sendGuestAppLinkEmailAction,
} from "@/features/bookings/guest-app-actions";

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

  function enableAndRegenerate() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const enabled = await enableGuestAppFromOwnerAction();
      if (!enabled.ok) {
        setError(enabled.error);
        return;
      }
      const res = await regenerateGuestAccessAction(bookingId);
      if (res.ok) {
        setUrl(res.url);
        setMessage(t("enabledAndRegenerated"));
      } else {
        setError(res.error);
      }
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
          <AdminInput
            readOnly
            value={url}
            fieldSize="sm"
          />
          <div className="flex flex-wrap gap-2">
            <AdminButton variant="primary" size="sm" onClick={copyUrl}>
              {t("copy")}
            </AdminButton>
            <AdminButton variant="secondary" size="sm" onClick={regenerate} disabled={pending}>
              {t("regenerate")}
            </AdminButton>
            {guestEmail ? (
              <AdminButton variant="soft" size="sm" onClick={sendEmail} disabled={pending}>
                {t("sendEmail")}
              </AdminButton>
            ) : null}
          </div>
        </div>
      ) : null}

      {message ? (
        <p className="mt-2 text-xs text-emerald-700">{message}</p>
      ) : null}
      {error ? (
        <div className="mt-2 space-y-2">
          <p className="text-xs text-red-600">{error}</p>
          <AdminButton variant="primary" size="sm" onClick={enableAndRegenerate} disabled={pending}>
            {t("enableAndRegenerate")}
          </AdminButton>
        </div>
      ) : null}
    </div>
  );
}
