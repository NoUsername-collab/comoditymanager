"use client";

import { useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { readPwaInstallContext } from "@/lib/pwa/install";
import { AdminInput } from "@/components/admin/ui/AdminInput";
import { LocaleFlagSpinner } from "@/components/ui/LocaleFlagSpinner";

type Props = {
  mandatory: boolean;
  next?: string;
};

export function MfaEnrollmentPanel({ mandatory, next = "/admin" }: Props) {
  const t = useTranslations("admin.mfa");
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enrolled, setEnrolled] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [pwaInstalled, setPwaInstalled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [secretCopied, setSecretCopied] = useState(false);

  useEffect(() => {
    const ctx = readPwaInstallContext();
    setPwaInstalled(ctx.installed);
    setIsMobile(ctx.isMobile);
  }, []);

  const preferManualSetup = pwaInstalled || isMobile;

  const refreshStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: factors, error: listError } =
        await supabase.auth.mfa.listFactors();
      if (listError) {
        setError(t("loadFailed"));
        return;
      }
      const verified = factors.totp.some((factor) => factor.status === "verified");
      setEnrolled(verified);
      if (verified) {
        setFactorId(null);
        setQrDataUrl(null);
        setSecret(null);
      }
    } catch {
      setError(t("loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  const handleEnroll = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "CasaEmil Admin",
      });

      if (enrollError || !data?.totp) {
        setError(t("enrollFailed"));
        return;
      }

      setFactorId(data.id);
      setSecret(data.totp.secret);
      const dataUrl = await QRCode.toDataURL(data.totp.uri, {
        margin: 1,
        width: 200,
        color: { dark: "#111111", light: "#ffffff" },
      });
      setQrDataUrl(dataUrl);
    } catch {
      setError(t("enrollFailed"));
    } finally {
      setBusy(false);
    }
  }, [t]);

  const handleVerifyEnrollment = useCallback(async () => {
    if (!factorId) return;
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: challenge, error: challengeError } =
        await supabase.auth.mfa.challenge({ factorId });

      if (challengeError || !challenge) {
        setError(t("verifyFailed"));
        return;
      }

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code: code.trim(),
      });

      if (verifyError) {
        setError(t("invalidCode"));
        return;
      }

      setEnrolled(true);
      setFactorId(null);
      setQrDataUrl(null);
      setSecret(null);
      setCode("");
      router.replace(next);
      router.refresh();
    } catch {
      setError(t("verifyFailed"));
    } finally {
      setBusy(false);
    }
  }, [code, factorId, next, router, t]);

  const handleUnenroll = useCallback(async () => {
    if (mandatory) return;
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: factors } = await supabase.auth.mfa.listFactors();
      for (const factor of factors?.totp ?? []) {
        await supabase.auth.mfa.unenroll({ factorId: factor.id });
      }
      await refreshStatus();
    } catch {
      setError(t("unenrollFailed"));
    } finally {
      setBusy(false);
    }
  }, [mandatory, refreshStatus, t]);

  const handleCopySecret = useCallback(async () => {
    if (!secret) return;
    try {
      await navigator.clipboard.writeText(secret);
      setSecretCopied(true);
      window.setTimeout(() => setSecretCopied(false), 2000);
    } catch {
      setError(t("copySecretFailed"));
    }
  }, [secret, t]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-zinc-600">
        <LocaleFlagSpinner label={t("loading")} size="md" />
        <span>{t("loading")}</span>
      </div>
    );
  }

  if (enrolled) {
    return (
      <div className="space-y-4">
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {t("enrolledSuccess")}
        </p>
        {!mandatory ? (
          <button
            type="button"
            className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
            onClick={() => void handleUnenroll()}
            disabled={busy}
          >
            {t("disable")}
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-950">
        {t("webPwaExplain")}
      </p>
      <p className="text-sm text-zinc-600">
        {mandatory ? t("mandatoryLead") : t("optionalLead")}
      </p>

      {!factorId ? (
        <button
          type="button"
          className="admin-login-submit"
          onClick={() => void handleEnroll()}
          disabled={busy}
        >
          {busy ? t("startingEnroll") : t("startEnroll")}
        </button>
      ) : (
        <div className="space-y-4">
          {preferManualSetup ? (
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm text-zinc-800">
              <p className="font-medium text-zinc-900">{t("mobileSetupTitle")}</p>
              <ol className="mt-2 list-decimal space-y-1 pl-4">
                <li>{t("mobileSetupStep1")}</li>
                <li>{t("mobileSetupStep2")}</li>
                <li>{t("mobileSetupStep3")}</li>
              </ol>
            </div>
          ) : null}

          {secret ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-zinc-900">
                {preferManualSetup ? t("manualKeyLead") : t("manualSecret")}
              </p>
              <div className="flex flex-wrap items-start gap-2">
                <code className="min-w-0 flex-1 break-all rounded-lg border border-zinc-200 bg-white px-3 py-2 font-mono text-xs text-zinc-800">
                  {secret}
                </code>
                <button
                  type="button"
                  className="shrink-0 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
                  onClick={() => void handleCopySecret()}
                >
                  {secretCopied ? t("copySecretDone") : t("copySecret")}
                </button>
              </div>
            </div>
          ) : null}

          {!preferManualSetup && qrDataUrl ? (
            <div>
              <p className="text-sm font-medium text-zinc-900">{t("scanQr")}</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrDataUrl}
                alt={t("qrAlt")}
                className="mt-2 rounded-lg border border-zinc-200 bg-white p-2"
              />
            </div>
          ) : null}

          {preferManualSetup && qrDataUrl ? (
            <details className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm">
              <summary className="cursor-pointer font-medium text-zinc-700">
                {t("qrDesktopOnly")}
              </summary>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrDataUrl}
                alt={t("qrAlt")}
                className="mt-2 rounded-lg border border-zinc-200 bg-white p-2"
              />
            </details>
          ) : null}
          <label className="block text-sm">
            {t("codeLabel")}
            <AdminInput
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder={t("codePlaceholder")}
              value={code}
              onChange={(event) => setCode(event.target.value)}
              className="mt-1 tracking-widest"
              minLength={6}
              maxLength={6}
              pattern="[0-9]{6}"
            />
          </label>
          <button
            type="button"
            className="admin-login-submit"
            onClick={() => void handleVerifyEnrollment()}
            disabled={busy || code.trim().length < 6}
          >
            {busy ? t("verifying") : t("confirmEnroll")}
          </button>
        </div>
      )}

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
