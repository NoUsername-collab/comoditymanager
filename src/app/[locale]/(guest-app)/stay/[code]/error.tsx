"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { reportTenantClientError } from "@/lib/tenant/report-client-error";

export default function GuestStayError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("guestApp.error");

  useEffect(() => {
    reportTenantClientError(error, "guest-stay");
  }, [error]);

  return (
    <div className="guest-app__alert-error mx-auto max-w-lg">
      <h1 className="guest-app__alert-error__title">{t("title")}</h1>
      <p className="guest-app__alert-error__body">{t("body")}</p>
      <button type="button" onClick={reset} className="guest-app__btn-primary mt-4">
        {t("retry")}
      </button>
      {error.digest ? (
        <p className="guest-app__muted mt-3 text-xs">{t("code", { digest: error.digest })}</p>
      ) : null}
    </div>
  );
}
