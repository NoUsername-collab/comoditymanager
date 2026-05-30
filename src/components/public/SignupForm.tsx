"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { signupAction } from "@/app/[locale]/(platform)/signup/actions";

export function SignupForm() {
  const t = useTranslations("signup");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorField, setErrorField] = useState<string | null>(null);

  return (
    <form
      className="signup-form"
      action={async (formData) => {
        setPending(true);
        setError(null);
        setErrorField(null);
        try {
          const result = await signupAction(formData);
          if (!result.ok) {
            setError(result.error);
            setErrorField(result.field ?? null);
          }
        } catch {
          setError(t("genericError"));
        } finally {
          setPending(false);
        }
      }}
    >
      {/* Pension name */}
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

      {/* Email */}
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

      {/* Password */}
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

      {/* Country */}
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

      {/* Hidden locale — auto-detected */}
      <input type="hidden" name="locale" value="ro" />

      {/* Error */}
      {error && (
        <div className="signup-form__error" role="alert">
          {error}
        </div>
      )}

      {/* Free plan badge */}
      <div className="signup-form__plan-badge">
        <span className="signup-form__plan-badge-label">{t("starterPlan")}</span>
        <span className="signup-form__plan-badge-detail">{t("starterDetail")}</span>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={pending}
        className="signup-form__submit"
      >
        {pending ? t("submitting") : t("submitButton")}
      </button>

      {/* Login link */}
      <p className="signup-form__login-link">
        {t("alreadyHaveAccount")}{" "}
        <a href="/admin/login" className="signup-form__link">
          {t("loginLink")}
        </a>
      </p>
    </form>
  );
}
