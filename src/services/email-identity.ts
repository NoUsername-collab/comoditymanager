import { cache } from "react";
import { headers } from "next/headers";
import { formatTransactionalFromAddress } from "@/domain/email/from-address";
import { platformPensionNameFallback } from "@/lib/platform/branding";
import { platformDomainFromRequestHost } from "@/lib/tenant/host";
import { resolveTenantIdForData } from "@/lib/tenant/resolve-id";
import { getEmailSettings } from "@/services/email-settings";
import { getPensionSettings } from "@/services/pension-settings";
import { getPublicSiteConfig } from "@/services/public-site/queries";
import { listTenantDomains } from "@/services/tenant-domains";
import { getTenantById } from "@/services/tenants";

export type TransactionalEmailIdentity = {
  displayName: string;
  mailDomain: string;
  fromAddress: string;
  defaultReplyTo: string | null;
};

function platformMailDomain(requestHost?: string | null): string {
  const fromEnv = process.env.RESEND_MAIL_DOMAIN?.trim();
  if (fromEnv) return fromEnv.replace(/^@/, "").toLowerCase();
  return platformDomainFromRequestHost(requestHost);
}

async function resolveMailDomain(
  tenantId: string,
  requestHost?: string | null,
): Promise<string> {
  const domains = await listTenantDomains(tenantId).catch(() => []);
  const customVerified = domains.find(
    (row) =>
      row.verified &&
      row.routing_kind !== "hospira_subdomain" &&
      row.domain.trim().length > 0,
  );
  if (customVerified) {
    return customVerified.domain.replace(/^@/, "").toLowerCase();
  }
  return platformMailDomain(requestHost);
}

async function resolveTransactionalEmailIdentityUncached(): Promise<TransactionalEmailIdentity> {
  const headerStore = await headers();
  const requestHost =
    headerStore.get("x-forwarded-host") ?? headerStore.get("host");

  const tenantId = await resolveTenantIdForData();
  const [pension, emailSettings, publicSite, tenant, mailDomain] =
    await Promise.all([
      getPensionSettings().catch(() => null),
      getEmailSettings().catch(() => null),
      getPublicSiteConfig().catch(() => null),
      getTenantById(tenantId).catch(() => null),
      resolveMailDomain(tenantId, requestHost),
    ]);

  const displayName =
    pension?.display_name?.trim() ||
    tenant?.display_name?.trim() ||
    publicSite?.displayName?.trim() ||
    platformPensionNameFallback();

  const defaultReplyTo =
    emailSettings?.email_reply_to?.trim() ||
    publicSite?.contact?.email?.trim() ||
    tenant?.owner_email?.trim() ||
    null;

  return {
    displayName,
    mailDomain,
    fromAddress: formatTransactionalFromAddress(displayName, mailDomain),
    defaultReplyTo,
  };
}

export const resolveTransactionalEmailIdentity = cache(
  resolveTransactionalEmailIdentityUncached,
);
