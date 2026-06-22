"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { readPwaInstallContext } from "@/lib/pwa/install";
import {
  clearUnverifiedTotpFactors,
  mapMfaEnrollError,
} from "@/lib/auth/mfa-enroll";
import { AdminInput } from "@/components/admin/ui/AdminInput";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { LocaleFlagSpinner } from "@/components/ui/LocaleFlagSpinner";

type Props = {
  next?: string;
};

export function MfaEnrollmentPanel({ next = "/admin" }: Props) {
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
      await clearUnverifiedTotpFactors(supabase);

      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Nestio Admin",
      });

      if (enrollError || !data?.totp) {
        setError(mapMfaEnrollError(enrollError?.message, t));
        return;
      }

      setFactorId(data.id);
      setSecret(data.totp.secret);
      const QRCode = (await import("qrcode")).default;
      const dataUrl = await QRCode.toDataURL(data.totp.uri, {
        margin: 1,
        width: 200,
        color: { dark: "#111111", light: "#ffffff" },
      });
      setQrDataUrl(dataUrl);
    } catch (e) {
      setError(
        mapMfaEnrollError(e instanceof Error ? e.message : undefined, t)
      );
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
  }, [refreshStatus, t]);

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
      <div className="settings-form-stack">
        <div className="settings-alerts">
          <p className="settings-alerts__item settings-alerts__item--success" role="status">
            {t("enrolledSuccess")}
          </p>
        </div>
        <AdminButton
          type="button"
          variant="danger"
          size="lg"
          onClick={() => void handleUnenroll()}
          disabled={busy}
        >
          {t("disable")}
        </AdminButton>
      </div>
    );
  }

  return (
    <div className="settings-form-stack">
      <div className="settings-alerts">
        <p className="settings-alerts__item settings-alerts__item--info">{t("webPwaExplain")}</p>
      </div>
      <p className="admin-settings-hint">{t("optionalLead")}</p>

      {!factorId ? (
        <AdminButton
          type="button"
          variant="primary"
          size="lg"
          onClick={() => void handleEnroll()}
          disabled={busy}
        >
          {busy ? t("startingEnroll") : t("startEnroll")}
        </AdminButton>
      ) : (
        <div className="settings-form-stack">
          {preferManualSetup ? (
            <div className="settings-alerts">
              <div className="settings-alerts__item settings-alerts__item--info">
                <p className="font-semibold">{t("mobileSetupTitle")}</p>
                <ol className="mt-2 list-decimal space-y-1 pl-4">
                  <li>{t("mobileSetupStep1")}</li>
                  <li>{t("mobileSetupStep2")}</li>
                  <li>{t("mobileSetupStep3")}</li>
                </ol>
              </div>
            </div>
          ) : null}

          {secret ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-zinc-900">
                {preferManualSetup ? t("manualKeyLead") : t("manualSecret")}
              </p>
              <div className="flex flex-wrap items-start gap-2">
                <code className="admin-settings-fields min-w-0 flex-1 break-all rounded-lg border border-zinc-200 bg-white px-3 py-2 font-mono text-xs">
                  {secret}
                </code>
                <AdminButton
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={() => void handleCopySecret()}
                >
                  {secretCopied ? t("copySecretDone") : t("copySecret")}
                </AdminButton>
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
          <label className="admin-settings-fields">
            <span>{t("codeLabel")}</span>
            <AdminInput
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder={t("codePlaceholder")}
              value={code}
              onChange={(event) => setCode(event.target.value)}
              className="tracking-widest"
              minLength={6}
              maxLength={6}
              pattern="[0-9]{6}"
            />
          </label>
          <AdminButton
            type="button"
            variant="primary"
            size="lg"
            onClick={() => void handleVerifyEnrollment()}
            disabled={busy || code.trim().length < 6}
          >
            {busy ? t("verifying") : t("confirmEnroll")}
          </AdminButton>
        </div>
      )}

      {error ? (
        <div className="settings-alerts">
          <p className="settings-alerts__item settings-alerts__item--error" role="alert">
            {error}
          </p>
        </div>
      ) : null}
    </div>
  );
}
