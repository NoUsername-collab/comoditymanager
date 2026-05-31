"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { signupAction } from "@/app/[locale]/(platform)/signup/actions";
import { normalizeTenantRedirectUrl } from "@/lib/tenant/normalize-redirect";

type SignupSuccess = {
  pensionName: string;
  email: string;
  slug: string;
  redirectTo: string;
};

export function SignupForm() {
  const t = useTranslations("signup");
  const locale = useLocale();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorField, setErrorField] = useState<string | null>(null);
  const [success, setSuccess] = useState<SignupSuccess | null>(null);
  const redirectTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (redirectTimer.current !== null) {
        window.clearTimeout(redirectTimer.current);
      }
    };
  }, []);

  if (success) {
    return (
      <div className="signup-form__success" role="status" aria-live="polite">
        <p className="signup-form__success-badge">{t("successBadge")}</p>
        <h3 className="signup-form__success-title">{t("successTitle")}</h3>
        <p className="signup-form__success-text">
          {t("successMessage", { name: success.pensionName })}
        </p>
        <p className="signup-form__success-email">
          {t("successEmail", { email: success.email })}
        </p>
        <p className="signup-form__success-redirect">{t("successRedirecting")}</p>
        <a href={success.redirectTo} className="signup-form__success-link">
          {t("successManualLink")}
        </a>
      </div>
    );
  }

  return (
    <form
      className="signup-form"
      action={async (formData) => {
        setPending(true);
        setError(null);
        setErrorField(null);
        formData.set("locale", locale);

        try {
          const result = await signupAction(formData);
          if (result.ok) {
            const redirectTo = normalizeTenantRedirectUrl(result.redirectTo);
            setSuccess({
              pensionName: result.pensionName,
              email: result.email,
              slug: result.slug,
              redirectTo,
            });
            redirectTimer.current = window.setTimeout(() => {
              window.location.assign(redirectTo);
            }, 2000);
            return;
          }
          setError(result.error);
          setErrorField(result.field ?? null);
        } catch (err) {
          console.error("[SIGNUP] Client error:", err);
          setError(t("genericError"));
        } finally {
          setPending(false);
        }
      }}
    >
      <div className="signup-form__field">
        <label htmlFor="signup-pension" className="signup-form__label">
          {t("pensionNameLabel")}
        </label>
        <input
          id="signup-pension"
          name="pension_name"
          type="text"
          required
          minLength={2}
          maxLength={100}
          placeholder={t("pensionNamePlaceholder")}
          autoComplete="organization"
          className={`signup-form__input ${errorField === "pension_name" ? "signup-form__input--error" : ""}`}
        />
        <p className="signup-form__hint">{t("pensionNameHint")}</p>
      </div>

      <div className="signup-form__field">
        <label htmlFor="signup-email" className="signup-form__label">
          {t("emailLabel")}
        </label>
        <input
          id="signup-email"
          name="email"
          type="email"
          required
          placeholder={t("emailPlaceholder")}
          autoComplete="email"
          className={`signup-form__input ${errorField === "email" ? "signup-form__input--error" : ""}`}
        />
      </div>

      <div className="signup-form__field">
        <label htmlFor="signup-password" className="signup-form__label">
          {t("passwordLabel")}
        </label>
        <input
          id="signup-password"
          name="password"
          type="password"
          required
          minLength={8}
          placeholder={t("passwordPlaceholder")}
          autoComplete="new-password"
          className={`signup-form__input ${errorField === "password" ? "signup-form__input--error" : ""}`}
        />
        <p className="signup-form__hint">{t("passwordHint")}</p>
      </div>

      <div className="signup-form__field">
        <label htmlFor="signup-country" className="signup-form__label">
          {t("countryLabel")}
        </label>
        <select
          id="signup-country"
          name="country"
          defaultValue="RO"
          className="signup-form__input"
        >
          <option value="RO">{t("countryRO")}</option>
          <option value="MD">{t("countryMD")}</option>
          <option value="BG">{t("countryBG")}</option>
        </select>
      </div>

      <input type="hidden" name="locale" value={locale} readOnly />

      {error && (
        <div className="signup-form__error" role="alert">
          {error}
        </div>
      )}

      <div className="signup-form__plan-badge">
        <span className="signup-form__plan-badge-label">{t("freePlan")}</span>
        <span className="signup-form__plan-badge-detail">{t("freePlanDetail")}</span>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="signup-form__submit"
      >
        {pending ? t("submitting") : t("submitButton")}
      </button>

      <p className="signup-form__login-link">
        {t("alreadyHaveAccount")}{" "}
        <a href="/admin/login" className="signup-form__link">
          {t("loginLink")}
        </a>
      </p>
    </form>
  );
}
