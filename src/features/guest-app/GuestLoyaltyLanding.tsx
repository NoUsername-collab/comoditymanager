"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { GUEST_LOYALTY_STORAGE_KEY } from "@/lib/guest-app/loyalty-storage";
import { isLoyaltyReferenceFormat } from "@/domain/guest-app/loyalty";
import { guestLoyaltyHref } from "@/domain/guest-app/loyalty";

export function GuestLoyaltyLanding({ pensionName }: { pensionName: string }) {
  const t = useTranslations("guestApp.loyalty");
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(GUEST_LOYALTY_STORAGE_KEY);
      if (stored && isLoyaltyReferenceFormat(stored)) {
        router.replace(guestLoyaltyHref(stored));
      }
    } catch {
      /* private mode */
    }
  }, [router]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoyaltyReferenceFormat(value)) {
      setError(t("invalidReference"));
      return;
    }
    router.push(guestLoyaltyHref(value));
  }

  return (
    <div className="guest-app__alert-warn" role="status">
      <p className="guest-app__alert-warn__eyebrow">{t("eyebrow")}</p>
      <h1 className="guest-app__alert-warn__title">{t("landingTitle", { name: pensionName })}</h1>
      <p className="guest-app__alert-warn__body">{t("landingBody")}</p>
      <form className="guest-loyalty-landing__form" onSubmit={onSubmit}>
        <label className="guest-loyalty-landing__label">
          <span>{t("referenceLabel")}</span>
          <input
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError(null);
            }}
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            placeholder="K7M2-Q9XW"
            className="guest-loyalty-landing__input"
          />
        </label>
        {error ? <p className="guest-app__alert-error__hint">{error}</p> : null}
        <button type="submit" className="guest-app__access-cta">
          {t("openCard")}
        </button>
      </form>
    </div>
  );
}
