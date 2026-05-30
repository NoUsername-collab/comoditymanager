"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { loginAction } from "@/app/[locale]/admin/login/actions";

export function AdminLoginForm({
  next,
  initialError = null,
}: {
  next: string;
  initialError?: string | null;
}) {
  const t = useTranslations("admin.login");
  const [error, setError] = useState<string | null>(initialError);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="mt-8 space-y-4"
      action={async (formData) => {
        setPending(true);
        setError(null);
        try {
          const result = await loginAction(formData);
          if (result?.error) setError(result.error);
        } finally {
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
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
          required
        />
      </label>
      <label className="block text-sm">
        {t("password")}
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
          required
        />
      </label>
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-zinc-900 py-2.5 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? t("submitting") : t("submit")}
      </button>
    </form>
  );
}
