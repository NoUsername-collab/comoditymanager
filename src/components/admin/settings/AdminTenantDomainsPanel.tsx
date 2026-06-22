"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { SettingsSection } from "@/components/admin/settings/SettingsSection";
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
    <div className="settings-form-stack tenant-domains-panel">
      <SettingsSection title={t("nestioSubdomain")} description={t("nestioSubdomainHint")}>
        <p className="font-mono text-sm font-semibold">{hospiraDomain?.domain ?? `${tenantSlug}.${platformDomain}`}</p>
        <a
          href={defaultUrl}
          className="settings-primary-link settings-primary-link--ghost mt-3"
          target="_blank"
          rel="noreferrer"
        >
          {t("openSite")}
        </a>
      </SettingsSection>

      {!canManageCustom ? (
        <div className="settings-alerts">
          <p className="settings-alerts__item settings-alerts__item--warning">{t("upgradeForCustom")}</p>
        </div>
      ) : null}

      {canManageCustom ? (
        <>
          <SettingsSection title={t("addCustomTitle")}>
            <form
              className="settings-form-stack"
              action={async (fd) => {
                setPending(true);
                setError(null);
                const result = await addCustomDomainAction(fd);
                setPending(false);
                if (!result.ok) setError(t(`errors.${result.error}`));
              }}
            >
              {error ? (
                <div className="settings-alerts">
                  <p className="settings-alerts__item settings-alerts__item--error" role="alert">
                    {error}
                  </p>
                </div>
              ) : null}
              <div className="admin-settings-fields">
                <label>
                  <span>{t("addCustomTitle")}</span>
                  <input
                    name="domain"
                    type="text"
                    required
                    placeholder="www.pensiunea-mea.ro"
                  />
                </label>
                <label>
                  <span>{t("routingKind")}</span>
                  <select name="routing_kind" defaultValue="custom_public">
                    {allowedKinds.map((kind) => (
                      <option key={kind} value={kind}>
                        {t(`kinds.${kind}`)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="settings-form-stack__submit">
                <AdminButton type="submit" variant="primary" size="lg" disabled={pending}>
                  {pending ? t("adding") : t("addDomain")}
                </AdminButton>
              </div>
            </form>
          </SettingsSection>

          {customDomains.length > 0 ? (
            <ul className="admin-settings-list">
                {customDomains.map((d) => (
                  <li key={d.id} className="admin-settings-list__row !items-start !flex-col">
                    <div>
                      <p className="admin-settings-list__label font-mono">{d.domain}</p>
                      <p className="admin-settings-hint">{t(`kinds.${d.routing_kind}`)}</p>
                      <p className="admin-settings-hint">
                        {d.verified ? t("statusVerified") : t("statusPending")}
                      </p>
                      <p className="admin-settings-hint">{t("dnsHint")}</p>
                    </div>
                    <div className="settings-dialog-actions !mt-2 !justify-start">
                      {!d.verified ? (
                        <form
                          action={async (fd) => {
                            const result = await verifyCustomDomainAction(fd);
                            if (!result.ok) setError(t(`errors.${result.error}`));
                          }}
                        >
                          <input type="hidden" name="domain_id" value={d.id} />
                          <AdminButton type="submit" variant="secondary" size="md">
                            {t("markVerified")}
                          </AdminButton>
                        </form>
                      ) : null}
                      <form
                        action={async (fd) => {
                          const result = await removeCustomDomainAction(fd);
                          if (!result.ok) setError(t(`errors.${result.error}`));
                        }}
                      >
                        <input type="hidden" name="domain_id" value={d.id} />
                        <AdminButton type="submit" variant="danger" size="md">
                          {t("remove")}
                        </AdminButton>
                      </form>
                    </div>
                  </li>
                ))}
            </ul>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
