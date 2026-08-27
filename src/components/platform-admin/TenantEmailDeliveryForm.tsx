"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { changeTenantEmailDeliveryAction, saveTenantResendVaultKeyAction, clearTenantResendVaultKeyAction } from "@/features/platform-admin/tenant-actions";
import type { TenantEmailDeliveryMode } from "@/domain/email/delivery-policy";
import type { TenantEmailOperatorSnapshot } from "@/services/tenant-email-delivery";

const MODES: TenantEmailDeliveryMode[] = [
  "platform",
  "tenant_resend",
  "disabled",
];

export function TenantEmailDeliveryForm({
  tenantId,
  snapshot,
}: {
  tenantId: string;
  snapshot: TenantEmailOperatorSnapshot;
}) {
  const t = useTranslations("platformAdmin.tenantDetail.emailDelivery");
  const router = useRouter();
  const [deliveryMode, setDeliveryMode] = useState(snapshot.delivery.deliveryMode);
  const [byokConfigured, setByokConfigured] = useState(snapshot.delivery.byokConfigured);
  const [monthlyCap, setMonthlyCap] = useState(
    snapshot.delivery.monthlySendCap?.toString() ?? "",
  );
  const [notes, setNotes] = useState(snapshot.delivery.operatorNotes ?? "");
  const [vaultKeyInput, setVaultKeyInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const [vaultPending, startVaultTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [vaultFeedback, setVaultFeedback] = useState<string | null>(null);

  const statusKey = snapshot.sendResolution.canSend
    ? "statusReady"
    : `status_${snapshot.sendResolution.skipReason ?? "unknown"}`;

  const handleSaveVaultKey = () => {
    const trimmed = vaultKeyInput.trim();
    if (!trimmed) return;
    setVaultFeedback(null);
    startVaultTransition(async () => {
      const result = await saveTenantResendVaultKeyAction(tenantId, trimmed);
      if (result.success) {
        setVaultKeyInput("");
        setByokConfigured(true);
        setVaultFeedback(t("vaultSaveSuccess"));
        router.refresh();
      } else {
        setVaultFeedback(t("vaultSaveError", { message: result.error ?? t("saveFailed") }));
      }
    });
  };

  const handleClearVaultKey = () => {
    setVaultFeedback(null);
    startVaultTransition(async () => {
      const result = await clearTenantResendVaultKeyAction(tenantId);
      if (result.success) {
        setVaultFeedback(t("vaultClearSuccess"));
        router.refresh();
      } else {
        setVaultFeedback(t("vaultClearError", { message: result.error ?? t("saveFailed") }));
      }
    });
  };

  const handleSave = () => {
    setFeedback(null);
    startTransition(async () => {
      const cap = monthlyCap.trim() ? Number.parseInt(monthlyCap, 10) : null;
      const result = await changeTenantEmailDeliveryAction(tenantId, {
        deliveryMode,
        byokConfigured,
        monthlySendCap: Number.isFinite(cap) ? cap : null,
        operatorNotes: notes.trim() || null,
      });
      if (result.success) {
        setFeedback(t("saveSuccess"));
        router.refresh();
      } else {
        setFeedback(t("saveError", { message: result.error ?? t("saveFailed") }));
      }
    });
  };

  return (
    <div className="space-y-3">
      <p
        className={`text-xs ${
          snapshot.sendResolution.canSend ? "text-emerald-400" : "text-amber-400"
        }`}
      >
        {t(statusKey)}
      </p>

      <dl className="space-y-1.5 text-xs text-neutral-400">
        <Row label={t("from")} value={snapshot.fromAddress ?? "—"} />
        <Row label={t("mailDomain")} value={snapshot.mailDomain ?? "—"} />
        <Row label={t("replyTo")} value={snapshot.replyTo ?? "—"} />
        <Row
          label={t("platformResend")}
          value={
            snapshot.platformResendConfigured
              ? t("platformResendOn", {
                  domain: snapshot.platformMailDomain ?? "—",
                })
              : t("platformResendOff")
          }
        />
        <Row
          label={t("tenantEmailEnabled")}
          value={snapshot.emailEnabled ? t("yes") : t("no")}
        />
        <Row
          label={t("verifiedDomains")}
          value={
            snapshot.verifiedCustomDomains.length > 0
              ? snapshot.verifiedCustomDomains.join(", ")
              : t("none")
          }
        />
        <Row
          label={t("effectiveCap")}
          value={
            snapshot.effectiveMonthlyCap == null
              ? t("unlimited")
              : String(snapshot.effectiveMonthlyCap)
          }
        />
        <Row
          label={t("usageThisMonth")}
          value={
            snapshot.effectiveMonthlyCap == null
              ? t("usageUnlimited", { sent: snapshot.monthlySentCount })
              : t("usageCapped", {
                  sent: snapshot.monthlySentCount,
                  cap: snapshot.effectiveMonthlyCap,
                })
          }
        />
      </dl>

      <div className="space-y-2 border-t border-neutral-800 pt-3">
        <span className="text-xs font-medium text-neutral-400">{t("modeLabel")}</span>
        {MODES.map((mode) => (
          <label
            key={mode}
            className={`nestio-tenant-option flex min-h-[var(--ml-touch-min,2.75rem)] cursor-pointer items-start gap-2 rounded-md border px-3 py-2 text-sm ${
              deliveryMode === mode
                ? "border-sky-600 bg-sky-950/40 text-white"
                : "border-neutral-700 text-neutral-400"
            }`}
          >
            <input
              type="radio"
              name="email-delivery-mode"
              checked={deliveryMode === mode}
              onChange={() => setDeliveryMode(mode)}
              className="mt-1"
            />
            <span>
              <span className="block font-medium">{t(`mode.${mode}.title`)}</span>
              <span className="block text-[11px] text-neutral-500">
                {t(`mode.${mode}.hint`)}
              </span>
            </span>
          </label>
        ))}
      </div>

      {deliveryMode === "tenant_resend" && (
        <div className="space-y-3 rounded-md border border-neutral-800 bg-neutral-950/50 p-2.5 text-xs">
          <div>
            <p className="font-medium text-neutral-300">{t("vaultTitle")}</p>
            <p className="mt-1 text-neutral-500">{t("vaultLead")}</p>
          </div>

          <Row
            label={t("vaultStored")}
            value={
              snapshot.vaultKeyHint
                ? t("vaultStoredYes", { hint: snapshot.vaultKeyHint })
                : t("vaultStoredNo")
            }
          />

          {snapshot.vaultKeySource === "tenant_env" && (
            <p className="text-amber-400">{t("vaultEnvFallbackActive", { env: snapshot.tenantResendEnvVar })}</p>
          )}

          <label className="block text-neutral-400">
            {t("vaultKeyLabel")}
            <input
              type="password"
              value={vaultKeyInput}
              onChange={(e) => setVaultKeyInput(e.target.value)}
              placeholder={t("vaultKeyPlaceholder")}
              autoComplete="off"
              className="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1.5 font-mono text-sm text-neutral-200"
            />
          </label>
          <p className="text-[11px] text-neutral-500">{t("vaultKeyHint")}</p>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleSaveVaultKey}
              disabled={vaultPending || !vaultKeyInput.trim()}
              className="rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
            >
              {vaultPending ? t("vaultSaving") : t("vaultSave")}
            </button>
            <button
              type="button"
              onClick={handleClearVaultKey}
              disabled={vaultPending || !snapshot.vaultKeyHint}
              className="rounded-md border border-neutral-600 px-3 py-1.5 text-xs text-neutral-300 hover:border-neutral-500 disabled:opacity-50"
            >
              {t("vaultClear")}
            </button>
          </div>

          {vaultFeedback && <p className="text-neutral-400">{vaultFeedback}</p>}

          <p className={snapshot.tenantResendKeyPresent ? "text-emerald-400" : "text-amber-400"}>
            {snapshot.tenantResendKeyPresent ? t("byokKeyPresent") : t("byokKeyMissing")}
          </p>

          <details className="text-neutral-500">
            <summary className="cursor-pointer text-[11px]">{t("vaultEnvLegacy")}</summary>
            <p className="mt-1">{t("byokHint", { env: snapshot.tenantResendEnvVar })}</p>
          </details>

          <label className="flex items-center gap-2 text-neutral-300">
            <input
              type="checkbox"
              checked={byokConfigured}
              onChange={(e) => setByokConfigured(e.target.checked)}
            />
            {t("byokConfirmed")}
          </label>
        </div>
      )}

      <label className="block text-xs text-neutral-400">
        {t("monthlyCapOverride")}
        <input
          type="number"
          min={0}
          value={monthlyCap}
          onChange={(e) => setMonthlyCap(e.target.value)}
          placeholder={t("monthlyCapPlaceholder")}
          className="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-sm text-neutral-200"
        />
      </label>

      <label className="block text-xs text-neutral-400">
        {t("operatorNotes")}
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-sm text-neutral-200"
        />
      </label>

      <button
        type="button"
        onClick={handleSave}
        disabled={isPending}
        className="w-full rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
      >
        {isPending ? t("saving") : t("save")}
      </button>

      {feedback && <p className="text-xs text-neutral-400">{feedback}</p>}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-neutral-500">{label}</dt>
      <dd className="max-w-[60%] truncate text-right text-neutral-300">{value}</dd>
    </div>
  );
}
