"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  generateOwnerMagicLinkAction,
  revalidateTenantCacheAction,
} from "@/app/[locale]/platform-admin/(panel)/actions/tools-actions";
import { CopyTextButton } from "@/components/platform-admin/CopyTextButton";

export function TenantOperatorPanel({
  tenantId,
  ownerEmail,
}: {
  tenantId: string;
  ownerEmail: string | null;
}) {
  const tQuick = useTranslations("platformAdmin.tenantDetail.quickLinks");
  const tSupport = useTranslations("platformAdmin.tenantDetail.support");
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
        result.success
          ? tSupport("cacheSuccess")
          : (result.error ?? tSupport("cacheFailed"))
      );
    });
  };

  const handleMagicLink = () => {
    setMagicError(null);
    setMagicLink(null);
    startMagic(async () => {
      const result = await generateOwnerMagicLinkAction(tenantId);
      if (!result.success || !result.data) {
        setMagicError(result.error ?? tSupport("magicFailed"));
        return;
      }
      setMagicLink(result.data.link);
    });
  };

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-3.5 space-y-3">
      <h2 className="text-sm font-semibold uppercase text-neutral-500">
        {tQuick("title")}
      </h2>

      <div className="space-y-2 border-b border-neutral-800 pb-3">
        <p className="text-xs text-neutral-500">{tSupport("magicHint")}</p>
        {!ownerEmail ? (
          <p className="text-xs text-amber-400">{tSupport("noOwnerEmail")}</p>
        ) : (
          <>
            <button
              type="button"
              onClick={handleMagicLink}
              disabled={magicPending}
              className="inline-flex min-h-[var(--ml-touch-min,2.75rem)] w-full items-center justify-center rounded-md border border-sky-900/50 bg-sky-950/30 px-4 py-2 text-sm font-medium text-sky-300 transition-colors hover:border-sky-800 hover:bg-sky-950/50 disabled:opacity-50 sm:w-auto"
            >
              {magicPending ? tSupport("magicPending") : tSupport("magicButton")}
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
                <CopyTextButton
                  text={magicLink}
                  label={tSupport("copyMagicLink")}
                />
                <p className="text-[11px] text-amber-400">
                  {tSupport("magicWarning")}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-xs text-neutral-500">{tSupport("cacheHint")}</p>
        <button
          type="button"
          onClick={handleRevalidate}
          disabled={cachePending}
          className="inline-flex min-h-[var(--ml-touch-min,2.75rem)] items-center rounded-md border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm text-neutral-200 transition-colors hover:border-neutral-600 hover:bg-neutral-700 disabled:opacity-50"
        >
          {cachePending ? tSupport("cachePending") : tSupport("cacheButton")}
        </button>
        {cacheMessage && (
          <p className="text-xs text-neutral-400" role="status">
            {cacheMessage}
          </p>
        )}
      </div>

      <Link
        href={`/platform-admin/logs?tenant=${tenantId}`}
        className="inline-flex min-h-[var(--ml-touch-min,2.75rem)] w-full items-center justify-center gap-2 rounded-md border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm text-neutral-200 transition-colors hover:border-neutral-600 hover:bg-neutral-700 sm:w-auto"
      >
        {tQuick("viewLogs")} →
      </Link>
    </div>
  );
}
