"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

export function GreenStayMockForm({ description }: { description?: string }) {
  const t = useTranslations("guestApp.greenStay");
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return <div className="guest-app__success-box">{t("success")}</div>;
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setSubmitted(true);
      }}
    >
      {description ? (
        <p className="guest-app__subtle text-sm leading-relaxed">{description}</p>
      ) : null}
      <label className="guest-app__subtle flex items-start gap-3 text-sm">
        <input type="checkbox" className="mt-1" required />
        <span>{t("checkbox")}</span>
      </label>
      <button type="submit" className="guest-app__btn-primary">
        {t("submit")}
      </button>
    </form>
  );
}
