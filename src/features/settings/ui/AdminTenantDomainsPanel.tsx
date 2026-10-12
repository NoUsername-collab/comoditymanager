"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { SettingsSection } from "@/components/admin/settings/SettingsSection";
import {
  addCustomDomainAction,
  removeCustomDomainAction,
  verifyCustomDomainAction,
} from "@/features/settings/actions/domains";
import type { TenantDomainRoutingKind } from "@/lib/tenant/domain-routing";
import type { TenantDomainRow } from "@/services/tenant-domains";
import { buildTenantAdminUrl } from "@/lib/tenant/host";

const DNS_TARGET = "cname.vercel-dns.com";

/** Record name for the registrar: the part before the main domain ("www"), or "@" for the bare domain. */
function dnsRecordName(domain: string): string {
  const labels = domain.trim().toLowerCase().split(".").filter(Boolean);
  return labels.length > 2 ? labels.slice(0, -2).join(".") : "@";
}

/** Numbered path from "added" to "live", with the one DNS record spelled out and copyable. */
function DomainActivationSteps({ domain }: { domain: string }) {
  const t = useTranslations("admin.domains");
  const [copied, setCopied] = useState(false);

  async function copyValue() {
    try {
      await navigator.clipboard.writeText(DNS_TARGET);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked — the value stays visible to copy by hand */
    }
  }

  return (
    <ol className="tenant-domains-steps">
      <li data-done="1">{t("stepAdded")}</li>
      <li>
        {t("stepSendRecord")}
        <dl className="tenant-domains-record">
          <dt>{t("recordType")}</dt>
          <dd>CNAME</dd>
          <dt>{t("recordName")}</dt>
          <dd>{dnsRecordName(domain)}</dd>
          <dt>{t("recordValue")}</dt>
          <dd>
            {DNS_TARGET}{" "}
            <button type="button" className="tenant-domains-record__copy" onClick={copyValue}>
              {copied ? t("copied") : t("copy")}
            </button>
          </dd>
        </dl>
      </li>
      <li>{t("stepWait")}</li>
    </ol>
  );
}

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

  const platformSubdomainRow = domains.find((d) => d.routing_kind === "platform_subdomain");
  const customDomains = domains.filter((d) => d.routing_kind !== "platform_subdomain");

  const defaultUrl = buildTenantAdminUrl(tenantSlug, "/", platformDomain);

  return (
    <div className="settings-form-stack tenant-domains-panel">
      <SettingsSection title={t("platformSubdomain")} description={t("platformSubdomainHint")}>
        <p className="font-mono text-sm font-semibold">{platformSubdomainRow?.domain ?? `${tenantSlug}.${platformDomain}`}</p>
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
          <SettingsSection title={t("addCustomTitle")} description={t("addCustomHint")}>
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
                      {!d.verified ? <DomainActivationSteps domain={d.domain} /> : null}
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
