"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { AdminInput } from "@/components/admin/ui/AdminInput";
import { LocaleFlagSpinner } from "@/components/ui/LocaleFlagSpinner";
import { completeLoginAfterMfaAction } from "@/app/[locale]/admin/login/actions";

type Props = {
  next: string;
  onCancel?: () => void;
};

export function MfaChallengeForm({ next, onCancel }: Props) {
  const t = useTranslations("admin.mfa");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      setError(null);
      setBusy(true);

      try {
        const supabase = createClient();
        const { data: factors, error: listError } =
          await supabase.auth.mfa.listFactors();

        if (listError) {
          setError(t("verifyFailed"));
          return;
        }

        const totpFactor = factors.totp.find((factor) => factor.status === "verified");
        if (!totpFactor) {
          setError(t("noFactor"));
          return;
        }

        const { data: challenge, error: challengeError } =
          await supabase.auth.mfa.challenge({ factorId: totpFactor.id });

        if (challengeError || !challenge) {
          setError(t("verifyFailed"));
          return;
        }

        const { error: verifyError } = await supabase.auth.mfa.verify({
          factorId: totpFactor.id,
          challengeId: challenge.id,
          code: code.trim(),
        });

        if (verifyError) {
          setError(t("invalidCode"));
          return;
        }

        await completeLoginAfterMfaAction(next);
      } catch {
        setError(t("verifyFailed"));
      } finally {
        setBusy(false);
      }
    },
    [code, next, t]
  );

  return (
    <form className="admin-login-form mt-5 space-y-3" onSubmit={handleSubmit}>
      <fieldset disabled={busy} className="admin-login-form__fieldset">
        <p className="text-sm text-zinc-600">{t("challengeLead")}</p>
        <label className="block text-sm">
          {t("codeLabel")}
          <AdminInput
            name="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder={t("codePlaceholder")}
            value={code}
            onChange={(event) => setCode(event.target.value)}
            className="mt-1 tracking-widest"
            required
            minLength={6}
            maxLength={6}
            pattern="[0-9]{6}"
          />
        </label>
        {error ? (
          <p className="admin-login-form__error text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
        <button type="submit" disabled={busy} className="admin-login-submit">
          {busy ? (
            <>
              <span className="admin-login-submit__spinner" aria-hidden>
                <LocaleFlagSpinner label={t("verifying")} size="md" />
              </span>
              <span>{t("verifying")}</span>
            </>
          ) : (
            <span>{t("verifySubmit")}</span>
          )}
        </button>
        {onCancel ? (
          <button
            type="button"
            className="admin-login-back mt-2 block w-full text-center"
            onClick={onCancel}
            disabled={busy}
          >
            {t("backToPassword")}
          </button>
        ) : null}
      </fieldset>
    </form>
  );
}
