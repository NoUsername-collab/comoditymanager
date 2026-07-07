/**
 * Platform infrastructure health — email delivery and custom domains.
 * Service-role reads only.
 */

import { cache } from "react";
import { getEmailDeliveryConfig } from "@/lib/email/provider";
import { throwIfDbError } from "@/lib/platform-admin/format-db-error";
import { createPublicAdminClient } from "@/lib/supabase/admin";

export type PlatformEmailHealth = {
  configured: boolean;
  provider: "resend" | "noop";
  mailDomain: string | null;
};

export type PlatformDomainHealth = {
  customDomains: number;
  unverified: number;
  sslPending: number;
  platformSubdomainsCount: number;
};

export type PlatformInfraHealth = {
  email: PlatformEmailHealth;
  domains: PlatformDomainHealth;
};

function resolvePlatformMailDomain(): string | null {
  const fromEnv = process.env.RESEND_MAIL_DOMAIN?.trim();
  if (fromEnv) return fromEnv.replace(/^@/, "").toLowerCase();
  const platformDomain = process.env.NEXT_PUBLIC_PLATFORM_DOMAIN?.trim();
  return platformDomain ? platformDomain.toLowerCase() : null;
}

/** Email + domain indicators for the platform admin dashboard. */
export const getPlatformInfraHealth = cache(async (): Promise<PlatformInfraHealth> => {
  const emailConfig = getEmailDeliveryConfig();
  const supabase = createPublicAdminClient();

  const { data: domainRows, error } = await supabase
    .from("tenant_domains")
    .select("domain, verified, ssl_active, routing_kind");

  throwIfDbError("tenant_domains (platform health)", error);

  let customDomains = 0;
  let unverified = 0;
  let sslPending = 0;
  let platformSubdomainsCount = 0;

  for (const row of domainRows ?? []) {
    const isSubdomain = row.routing_kind === "hospira_subdomain";
    if (isSubdomain) {
      platformSubdomainsCount += 1;
      continue;
    }
    customDomains += 1;
    if (!row.verified) unverified += 1;
    if (row.verified && !row.ssl_active) sslPending += 1;
  }

  return {
    email: {
      configured: emailConfig.configured,
      provider: emailConfig.provider,
      mailDomain: resolvePlatformMailDomain(),
    },
    domains: {
      customDomains,
      unverified,
      sslPending,
      platformSubdomainsCount,
    },
  };
});
