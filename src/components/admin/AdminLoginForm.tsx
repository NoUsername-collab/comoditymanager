"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import {
  loginAction,
  type LoginFormState,
} from "@/app/[locale]/admin/login/actions";
import { LocaleFlagSpinner } from "@/components/ui/LocaleFlagSpinner";

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
  const [state, formAction, isPending] = useActionState(loginAction, {
    error: initialError,
  } satisfies LoginFormState);

  const error = state.error;
  const busy = isPending;

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
            <input
              name="username"
              type="text"
              autoComplete="username"
              placeholder={t("usernameOrEmailPlaceholder")}
              defaultValue={initialUsername}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder:text-zinc-400 disabled:opacity-60"
              required
            />
          </label>
          <label className="block text-sm">
            {t("password")}
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 disabled:opacity-60"
              required
            />
          </label>
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
