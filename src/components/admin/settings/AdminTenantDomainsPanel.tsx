"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { AdminInput, AdminSelect } from "@/components/admin/ui/AdminInput";
import {
  addCustomDomainAction,
  removeCustomDomainAction,
  verifyCustomDomainAction,
} from "@/app/[locale]/admin/(panel)/settings/domains/actions";
import type { TenantDomainRoutingKind } from "@/lib/tenant/domain-routing";
import type { TenantDomainRow } from "@/services/tenant-domains";
import { buildTenantAdminUrl } from "@/lib/tenant/host";

type Props = {
  domains: TenantDomainRow[];
  tenantSlug: string;
  platformDomain: string;
  allowedKinds: TenantDomainRoutingKind[];
  canManageCustom: boolean;
};

export function AdminTenantDomainsPanel({
  domains,
  tenantSlug,
  platformDomain,
  allowedKinds,
  canManageCustom,
}: Props) {
  const t = useTranslations("admin.domains");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const hospiraDomain = domains.find((d) => d.routing_kind === "hospira_subdomain");
  const customDomains = domains.filter((d) => d.routing_kind !== "hospira_subdomain");

  const defaultUrl = buildTenantAdminUrl(tenantSlug, "/", platformDomain);

  return (
    <div className="tenant-domains-panel space-y-4">
      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
        <p className="text-sm font-medium text-zinc-900">{t("hospiraSubdomain")}</p>
        <p className="mt-1 font-mono text-sm text-amber-800">
          {hospiraDomain?.domain ?? `${tenantSlug}.${platformDomain}`}
        </p>
        <p className="mt-2 text-xs text-zinc-600">{t("hospiraSubdomainHint")}</p>
        <a
          href={defaultUrl}
          className="mt-2 inline-block text-sm text-amber-700 underline"
          target="_blank"
          rel="noreferrer"
        >
          {t("openSite")}
        </a>
      </div>

      {!canManageCustom && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {t("upgradeForCustom")}
        </p>
      )}

      {canManageCustom && (
        <>
          <form
            className="space-y-3 rounded-xl border border-zinc-200 p-4"
            action={async (fd) => {
              setPending(true);
              setError(null);
              const result = await addCustomDomainAction(fd);
              setPending(false);
              if (!result.ok) setError(t(`errors.${result.error}`));
            }}
          >
            <p className="text-sm font-medium text-zinc-900">{t("addCustomTitle")}</p>
            <AdminInput
              name="domain"
              type="text"
              required
              placeholder="www.pensiunea-mea.ro"
            />
            <label className="block text-sm text-zinc-700">{t("routingKind")}</label>
            <AdminSelect
              name="routing_kind"
              defaultValue="custom_public"
            >
              {allowedKinds.map((kind) => (
                <option key={kind} value={kind}>
                  {t(`kinds.${kind}`)}
                </option>
              ))}
            </AdminSelect>
            {error && (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            )}
            <AdminButton type="submit" variant="primary" disabled={pending}>
              {pending ? t("adding") : t("addDomain")}
            </AdminButton>
          </form>

          {customDomains.length > 0 && (
            <ul className="space-y-3">
              {customDomains.map((d) => (
                <li
                  key={d.id}
                  className="tenant-domain-card rounded-xl border border-zinc-200 p-4 text-sm"
                >
                  <p className="font-mono font-medium">{d.domain}</p>
                  <p className="mt-1 text-zinc-600">{t(`kinds.${d.routing_kind}`)}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {d.verified ? t("statusVerified") : t("statusPending")}
                  </p>
                  <p className="mt-2 text-xs text-zinc-600">{t("dnsHint")}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {!d.verified && (
                      <form
                        action={async (fd) => {
                          const result = await verifyCustomDomainAction(fd);
                          if (!result.ok) setError(t(`errors.${result.error}`));
                        }}
                      >
                        <input type="hidden" name="domain_id" value={d.id} />
                        <AdminButton type="submit" variant="secondary" size="sm">
                          {t("markVerified")}
                        </AdminButton>
                      </form>
                    )}
                    <form
                      action={async (fd) => {
                        const result = await removeCustomDomainAction(fd);
                        if (!result.ok) setError(t(`errors.${result.error}`));
                      }}
                    >
                      <input type="hidden" name="domain_id" value={d.id} />
                      <AdminButton type="submit" variant="danger" size="sm">
                        {t("remove")}
                      </AdminButton>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
