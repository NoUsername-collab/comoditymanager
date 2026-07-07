import { getTranslations } from "next-intl/server";
import { CopyTextButton } from "@/components/platform-admin/CopyTextButton";
import type { TenantDomainRow } from "@/services/tenant-domains";

export async function TenantDomainsPanel({
  domains,
  slug,
}: {
  domains: TenantDomainRow[];
  slug: string;
}) {
  const t = await getTranslations("platformAdmin.tenantDetail.domains");

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-3.5 space-y-2">
      <h2 className="text-sm font-semibold uppercase text-neutral-500">
        {t("title")}
      </h2>
      {domains.length === 0 ? (
        <p className="text-xs text-neutral-500">{t("empty")}</p>
      ) : (
        <ul className="space-y-2">
          {domains.map((domain) => (
            <li
              key={domain.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-neutral-800/50 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate font-mono text-sm text-neutral-200">
                  {domain.domain}
                </p>
                <p className="text-[11px] text-neutral-500">
                  {domain.routing_kind}
                  {!domain.verified && ` · ${t("unverified")}`}
                  {domain.verified && !domain.ssl_active && ` · ${t("sslPending")}`}
                </p>
              </div>
              <CopyTextButton text={domain.domain} />
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-2 pt-1">
        <CopyTextButton text={slug} label={t("copySlug")} />
      </div>
    </div>
  );
}
