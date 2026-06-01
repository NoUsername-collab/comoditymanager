"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { loginAction } from "@/app/[locale]/admin/login/actions";
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
  const [error, setError] = useState<string | null>(initialError);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="admin-login-form mt-8 space-y-4"
      action={async (formData) => {
        setPending(true);
        setError(null);
        const result = await loginAction(formData);
        if (result?.error) {
          setError(result.error);
          setPending(false);
        }
      }}
    >
      <input type="hidden" name="next" value={next} />
      <label className="block text-sm">
        {t("username")}
        <input
          name="username"
          type="text"
          autoComplete="username"
          placeholder={t("usernameOrEmailPlaceholder")}
          defaultValue={initialUsername}
          disabled={pending}
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
          disabled={pending}
          className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 disabled:opacity-60"
          required
        />
      </label>
      {error && (
        <p className="admin-login-form__error text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className="admin-login-submit"
      >
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
    </form>
  );
}
