"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  generateOwnerMagicLinkAction,
  revalidateTenantCacheAction,
} from "@/app/[locale]/hospira-admin/(panel)/actions/tools-actions";
import { CopyTextButton } from "@/components/hospira-admin/CopyTextButton";

export function TenantSupportTools({
  tenantId,
  ownerEmail,
}: {
  tenantId: string;
  ownerEmail: string | null;
}) {
  const t = useTranslations("hospiraAdmin.tenantDetail.support");
  const [cachePending, startCache] = useTransition();
  const [magicPending, startMagic] = useTransition();
  const [cacheMessage, setCacheMessage] = useState<string | null>(null);
  const [magicLink, setMagicLink] = useState<string | null>(null);
  const [magicError, setMagicError] = useState<string | null>(null);

  const handleRevalidate = () => {
    setCacheMessage(null);
    startCache(async () => {
      const result = await revalidateTenantCacheAction(tenantId);
      setCacheMessage(
        result.success ? t("cacheSuccess") : (result.error ?? t("cacheFailed"))
      );
    });
  };

  const handleMagicLink = () => {
    setMagicError(null);
    setMagicLink(null);
    startMagic(async () => {
      const result = await generateOwnerMagicLinkAction(tenantId);
      if (!result.success || !result.data) {
        setMagicError(result.error ?? t("magicFailed"));
        return;
      }
      setMagicLink(result.data.link);
    });
  };

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-3.5 space-y-3">
      <h2 className="text-sm font-semibold uppercase text-neutral-500">
        {t("title")}
      </h2>

      <div className="space-y-2">
        <p className="text-xs text-neutral-500">{t("cacheHint")}</p>
        <button
          type="button"
          onClick={handleRevalidate}
          disabled={cachePending}
          className="inline-flex min-h-[var(--ml-touch-min,2.75rem)] items-center rounded-md border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm text-neutral-200 transition-colors hover:border-neutral-600 hover:bg-neutral-700 disabled:opacity-50"
        >
          {cachePending ? t("cachePending") : t("cacheButton")}
        </button>
        {cacheMessage && (
          <p className="text-xs text-neutral-400" role="status">
            {cacheMessage}
          </p>
        )}
      </div>

      <div className="space-y-2 border-t border-neutral-800 pt-3">
        <p className="text-xs text-neutral-500">{t("magicHint")}</p>
        {!ownerEmail ? (
          <p className="text-xs text-amber-400">{t("noOwnerEmail")}</p>
        ) : (
          <>
            <button
              type="button"
              onClick={handleMagicLink}
              disabled={magicPending}
              className="inline-flex min-h-[var(--ml-touch-min,2.75rem)] items-center rounded-md border border-sky-900/50 bg-sky-950/30 px-4 py-2 text-sm text-sky-300 transition-colors hover:border-sky-800 hover:bg-sky-950/50 disabled:opacity-50"
            >
              {magicPending ? t("magicPending") : t("magicButton")}
            </button>
            {magicError && (
              <p className="text-xs text-red-400" role="alert">
                {magicError}
              </p>
            )}
            {magicLink && (
              <div className="space-y-2 rounded-md border border-neutral-700 bg-neutral-800/50 p-2">
                <p className="break-all font-mono text-[11px] text-neutral-300">
                  {magicLink}
                </p>
                <CopyTextButton text={magicLink} label={t("copyMagicLink")} />
                <p className="text-[11px] text-amber-400">{t("magicWarning")}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
