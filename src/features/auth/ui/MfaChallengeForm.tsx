"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { readPwaInstallContext } from "@/lib/pwa/install";
import { AdminInput } from "@/components/admin/ui/AdminInput";
import { LocaleFlagSpinner } from "@/components/ui/LocaleFlagSpinner";
import { completeLoginAfterMfaAction } from "@/features/auth/login";
import { verifyTotpChallenge } from "@/lib/auth/mfa-browser";

type Props = {
  next: string;
  onCancel?: () => void;
};

export function MfaChallengeForm({ next, onCancel }: Props) {
  const t = useTranslations("admin.mfa");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showMobileHint, setShowMobileHint] = useState(false);

  useEffect(() => {
    const ctx = readPwaInstallContext();
    setShowMobileHint(ctx.installed || ctx.isMobile);
  }, []);

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      setError(null);
      setBusy(true);

      try {
        const verified = await verifyTotpChallenge(code);
        if (!verified.ok) {
          setError(
            verified.reason === "invalid_code"
              ? t("invalidCode")
              : verified.reason === "no_factor"
                ? t("noFactor")
                : t("verifyFailed")
          );
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
        {showMobileHint ? (
          <p className="mt-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-950">
            {t("challengePwaLead")}
          </p>
        ) : null}
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
