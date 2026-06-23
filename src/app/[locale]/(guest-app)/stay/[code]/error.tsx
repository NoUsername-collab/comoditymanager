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
    <div className="guest-app__alert-error" role="alert">
      <h1 className="guest-app__alert-error__title">{t("title")}</h1>
      <p className="guest-app__alert-error__body">{t("body")}</p>
      <button type="button" onClick={reset} className="guest-app__btn-primary guest-app__alert-error__retry">
        {t("retry")}
      </button>
    </div>
  );
}
