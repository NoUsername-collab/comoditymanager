"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import {
  loginAction,
  type LoginFormState,
} from "@/app/[locale]/admin/login/actions";
import { useState } from "react";
import { MfaChallengeForm } from "@/components/admin/auth/MfaChallengeForm";
import { AdminInput } from "@/components/admin/ui/AdminInput";
import { LocaleFlagSpinner } from "@/components/ui/LocaleFlagSpinner";
import { Link } from "@/i18n/navigation";

export function AdminLoginForm({
  next,
  initialError = null,
  initialUsername = "",
}: {
  next: string;
  initialError?: string | null;
  initialUsername?: string;
}) {
  const t = useTranslations("admin.login");
  const tMfa = useTranslations("admin.mfa");
  const [showMfa, setShowMfa] = useState(false);
  const [state, formAction, isPending] = useActionState(loginAction, {
    error: initialError,
  } satisfies LoginFormState);

  const mfaStep = showMfa || Boolean(state.mfaRequired);
  const error = state.error;
  const busy = isPending;

  if (mfaStep) {
    return (
      <div className="mt-5">
        <p className="text-xs font-medium uppercase tracking-wide text-blue-700">
          {tMfa("loginStep")}
        </p>
        <h2 className="mt-1 text-lg font-semibold text-zinc-900">
          {tMfa("loginTitle")}
        </h2>
        <MfaChallengeForm
          next={next}
          onCancel={() => setShowMfa(false)}
        />
      </div>
    );
  }

  return (
    <>
      {busy ? (
        <div
          className="admin-login-overlay"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="admin-login-overlay__inner">
            <LocaleFlagSpinner label={t("submitting")} size="lg" />
            <p className="admin-login-overlay__label">{t("submitting")}</p>
          </div>
        </div>
      ) : null}
      <form
        className="admin-login-form mt-5 space-y-3"
        action={formAction}
        aria-busy={busy}
      >
        <fieldset disabled={busy} className="admin-login-form__fieldset">
          <input type="hidden" name="next" value={next} />
          <label className="block text-sm">
            {t("username")}
            <AdminInput
              name="username"
              type="text"
              autoComplete="username"
              placeholder={t("usernameOrEmailPlaceholder")}
              defaultValue={initialUsername}
              className="mt-1"
              required
            />
          </label>
          <label className="block text-sm">
            {t("password")}
            <AdminInput
              name="password"
              type="password"
              autoComplete="current-password"
              className="mt-1"
              required
            />
          </label>
          <Link href="/admin/forgot-password" className="admin-login-forgot">
            {t("forgotPassword")}
          </Link>
          {error ? (
            <p
              className="admin-login-form__error text-sm text-red-600"
              role="alert"
            >
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={busy}
            aria-busy={busy}
            className="admin-login-submit"
          >
            {busy ? (
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
