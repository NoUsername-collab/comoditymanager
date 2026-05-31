"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { unlockAlphaGateAction } from "@/app/[locale]/alpha-gate/actions";

type AlphaGateFormProps = {
  nextPath: string;
};

export function AlphaGateForm({ nextPath }: AlphaGateFormProps) {
  const t = useTranslations("alphaGate");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="alpha-gate-form space-y-4"
      action={async (formData) => {
        setPending(true);
        setError(null);
        try {
          const result = await unlockAlphaGateAction(formData);
          if (result?.error === "wrongPassword") {
            setError(t("wrongPassword"));
          }
        } finally {
          setPending(false);
        }
      }}
    >
      <input type="hidden" name="next" value={nextPath} />
      <label className="block text-sm">
        <span className="text-[var(--site-muted,#b7af9a)]">{t("passwordLabel")}</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          autoFocus
          required
          className="mt-2 w-full rounded-lg border border-[color-mix(in_srgb,var(--site-accent,#d6b55a)_28%,#1b1824)] bg-[var(--site-card,#0e0c14)] px-3 py-2.5 text-[var(--site-fg,#f3efe3)] outline-none ring-[var(--site-accent,#d6b55a)] focus:ring-2"
        />
      </label>
      {error && (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-[var(--site-accent,#d6b55a)] px-4 py-2.5 text-sm font-medium text-[var(--site-accent-fg,#0b0a0f)] disabled:opacity-60"
      >
        {pending ? t("checking") : t("submit")}
      </button>
    </form>
  );
}
