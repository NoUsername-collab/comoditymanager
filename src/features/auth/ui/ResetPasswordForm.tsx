"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { resetPasswordAction } from "@/features/auth/reset-password";
import { LocaleFlagSpinner } from "@/components/ui/LocaleFlagSpinner";

export function ResetPasswordForm() {
  const t = useTranslations("admin.resetPassword");
  const router = useRouter();
  const passwordRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div className="admin-auth-success mt-5" role="status" aria-live="polite">
        <p className="admin-auth-success__title">{t("successTitle")}</p>
        <p className="admin-auth-success__text">{t("successText")}</p>
      </div>
    );
  }

  return (
    <>
      {pending && (
        <div className="admin-login-overlay" role="status" aria-live="polite" aria-busy>
          <div className="admin-login-overlay__inner">
            <LocaleFlagSpinner label={t("submitting")} size="lg" />
            <p className="admin-login-overlay__label">{t("submitting")}</p>
          </div>
        </div>
      )}
      <form
        className="admin-login-form mt-5 space-y-3"
        action={async (fd) => {
          setPending(true);
          setError(null);
          setFieldError(null);
          try {
            const result = await resetPasswordAction(fd);
            if (result.ok) {
              setDone(true);
              setTimeout(() => router.push("/admin/login"), 2000);
            } else {
              if (result.field) setFieldError(result.error);
              else setError(result.error);
            }
          } catch {
            setError(t("genericError"));
          } finally {
            setPending(false);
          }
        }}
      >
        <fieldset disabled={pending} className="admin-login-form__fieldset">
          <label className="block text-sm">
            {t("passwordLabel")}
            <input
              ref={passwordRef}
              name="password"
              type="password"
              required
              minLength={8}
              placeholder={t("passwordPlaceholder")}
              autoComplete="new-password"
              className="admin-input mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </label>
          <label className="block text-sm">
            {t("confirmLabel")}
            <input
              name="confirm"
              type="password"
              required
              minLength={8}
              placeholder={t("confirmPlaceholder")}
              autoComplete="new-password"
              className="admin-input mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </label>
          {(error || fieldError) && (
            <p className="admin-login-form__error text-sm text-red-600" role="alert">
              {error ?? fieldError}
            </p>
          )}
          <button type="submit" disabled={pending} className="admin-login-submit">
            {pending ? (
              <>
                <span className="admin-login-submit__spinner" aria-hidden>
                  <LocaleFlagSpinner label={t("submitting")} size="md" />
                </span>
                <span>{t("submitting")}</span>
              </>
            ) : (
              <span>{t("submit")}</span>
            )}
          </button>
        </fieldset>
      </form>
    </>
  );
}
