"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import type { TenantDomainRoutingKind } from "@/lib/tenant/domain-routing";
import {
  platformAddTenantDomainAction,
  platformRemoveTenantDomainAction,
  platformVerifyTenantDomainAction,
} from "@/features/platform-admin/domain-actions";
import { CopyTextButton } from "@/components/platform-admin/CopyTextButton";
import type { TenantDomainRow } from "@/services/tenant-domains";

const ROUTING_OPTIONS: TenantDomainRoutingKind[] = [
  "custom_public",
  "custom_full",
  "custom_brand",
];

export function TenantDomainsManager({
  tenantId,
  domains,
  slug,
}: {
  tenantId: string;
  domains: TenantDomainRow[];
  slug: string;
}) {
  const t = useTranslations("platformAdmin.tenantDetail.domains");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [domain, setDomain] = useState("");
  const [routingKind, setRoutingKind] =
    useState<TenantDomainRoutingKind>("custom_public");
  const [feedback, setFeedback] = useState<string | null>(null);

  const runAction = (action: () => Promise<{ success: boolean; error?: string }>) => {
    setFeedback(null);
    startTransition(async () => {
      const result = await action();
      if (result.success) {
        setFeedback(t("actionSuccess"));
        router.refresh();
      } else {
        setFeedback(result.error ?? t("actionFailed"));
      }
    });
  };

  const handleAdd = (event: React.FormEvent) => {
    event.preventDefault();
    const value = domain.trim();
    if (!value) return;
    runAction(() =>
      platformAddTenantDomainAction(tenantId, value, routingKind)
    );
    setDomain("");
  };

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-3.5 space-y-3">
      <h2 className="text-sm font-semibold uppercase text-neutral-500">
        {t("title")}
      </h2>

      {domains.length === 0 ? (
        <p className="text-xs text-neutral-500">{t("empty")}</p>
      ) : (
        <ul className="space-y-2">
          {domains.map((row) => (
            <li
              key={row.id}
              className="flex flex-col gap-2 rounded-md bg-neutral-800/50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate font-mono text-sm text-neutral-200">
                  {row.domain}
                </p>
                <p className="text-[11px] text-neutral-500">
                  {row.routing_kind}
                  {!row.verified && ` · ${t("unverified")}`}
                  {row.verified && !row.ssl_active && ` · ${t("sslPending")}`}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <CopyTextButton text={row.domain} />
                {row.routing_kind !== "hospira_subdomain" && (
                  <>
                    {!row.verified && (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() =>
                          runAction(() =>
                            platformVerifyTenantDomainAction(tenantId, row.id)
                          )
                        }
                        className="rounded-md border border-emerald-900/50 bg-emerald-950/30 px-2 py-1 text-xs text-emerald-300 hover:bg-emerald-950/50 disabled:opacity-50"
                      >
                        {t("verify")}
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        runAction(() =>
                          platformRemoveTenantDomainAction(tenantId, row.id)
                        )
                      }
                      className="rounded-md border border-red-900/50 bg-red-950/30 px-2 py-1 text-xs text-red-300 hover:bg-red-950/50 disabled:opacity-50"
                    >
                      {t("remove")}
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleAdd} className="space-y-2 border-t border-neutral-800 pt-3">
        <p className="text-xs text-neutral-500">{t("addHint")}</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder={t("domainPlaceholder")}
            className="min-h-[var(--ml-touch-min,2.75rem)] flex-1 rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 font-mono text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-sky-600 focus:outline-none"
          />
          <select
            value={routingKind}
            onChange={(e) =>
              setRoutingKind(e.target.value as TenantDomainRoutingKind)
            }
            className="min-h-[var(--ml-touch-min,2.75rem)] rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-200 focus:border-sky-600 focus:outline-none"
            aria-label={t("routingKind")}
          >
            {ROUTING_OPTIONS.map((kind) => (
              <option key={kind} value={kind}>
                {kind}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={pending || !domain.trim()}
            className="min-h-[var(--ml-touch-min,2.75rem)] rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
          >
            {pending ? t("adding") : t("add")}
          </button>
        </div>
      </form>

      <div className="flex flex-wrap gap-2">
        <CopyTextButton text={slug} label={t("copySlug")} />
      </div>

      {feedback && (
        <p
          className={`text-xs ${feedback === t("actionSuccess") ? "text-emerald-400" : "text-red-400"}`}
          role="status"
        >
          {feedback}
        </p>
      )}
    </div>
  );
}
