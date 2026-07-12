import { cache } from "react";
import {
  DEFAULT_TENANT_EMAIL_DELIVERY,
  effectiveMonthlySendCap,
  resolveTenantEmailSend,
  tenantResendEnvKey,
  type TenantEmailDeliveryMode,
  type TenantEmailDeliveryRecord,
  type TenantEmailSendResolution,
} from "@/domain/email/delivery-policy";
import { resolveTenantResendApiKeyForTenant } from "@/services/tenant-email-secrets";
import { getTenantEmailSentCountForMonth } from "@/services/tenant-email-usage";
import { currentUtcMonthPeriod } from "@/domain/email/usage-cap";
import { getPlanConfig, resolvePlanId } from "@/core/config/plans";
import { getEmailDeliveryConfig } from "@/lib/email/provider";
import { createPublicAdminClient } from "@/lib/supabase/admin";
import { getEmailSettingsForTenant } from "@/services/email-settings";
import { resolveTransactionalEmailIdentityForTenant } from "@/services/email-identity";
import { listTenantDomains } from "@/services/tenant-domains";
import { getTenantById } from "@/services/tenants";

type DeliveryRow = {
  tenant_id: string;
  delivery_mode: TenantEmailDeliveryMode;
  mail_domain_override: string | null;
  monthly_send_cap: number | null;
  byok_configured: boolean;
  operator_notes: string | null;
};

function mapDeliveryRow(row: DeliveryRow): TenantEmailDeliveryRecord {
  return {
    deliveryMode: row.delivery_mode,
    mailDomainOverride: row.mail_domain_override,
    monthlySendCap: row.monthly_send_cap,
    byokConfigured: row.byok_configured,
    operatorNotes: row.operator_notes,
  };
}

function platformMailDomain(): string | null {
  const fromEnv = process.env.RESEND_MAIL_DOMAIN?.trim();
  if (fromEnv) return fromEnv.replace(/^@/, "").toLowerCase();
  const platformDomain = process.env.NEXT_PUBLIC_PLATFORM_DOMAIN?.trim();
  return platformDomain ? platformDomain.toLowerCase() : null;
}

export async function getTenantEmailDelivery(
  tenantId: string,
): Promise<TenantEmailDeliveryRecord> {
  const supabase = createPublicAdminClient();
  const { data, error } = await supabase
    .from("tenant_email_delivery")
    .select(
      "tenant_id, delivery_mode, mail_domain_override, monthly_send_cap, byok_configured, operator_notes",
    )
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (error) {
    if (error.message.includes("tenant_email_delivery")) {
      return DEFAULT_TENANT_EMAIL_DELIVERY;
    }
    throw new Error(error.message);
  }

  if (!data) return DEFAULT_TENANT_EMAIL_DELIVERY;
  return mapDeliveryRow(data as DeliveryRow);
}

export type TenantEmailOperatorSnapshot = {
  delivery: TenantEmailDeliveryRecord;
  planId: string;
  slug: string;
  effectiveMonthlyCap: number | null;
  platformResendConfigured: boolean;
  platformMailDomain: string | null;
  tenantResendEnvVar: string;
  tenantResendKeyPresent: boolean;
  vaultKeyHint: string | null;
  vaultKeySource: "tenant_vault" | "tenant_env" | "none";
  envFallbackPresent: boolean;
  fromAddress: string | null;
  mailDomain: string | null;
  replyTo: string | null;
  emailEnabled: boolean;
  verifiedCustomDomains: string[];
  sendResolution: TenantEmailSendResolution;
  monthlySentCount: number;
  usagePeriodMonth: string;
};

export async function getTenantEffectiveMonthlyCap(
  tenantId: string,
): Promise<number | null> {
  const tenant = await getTenantById(tenantId);
  if (!tenant) return null;
  const delivery = await getTenantEmailDelivery(tenantId);
  return effectiveMonthlySendCap(getPlanConfig(tenant.plan_id), delivery);
}

export const getTenantEmailOperatorSnapshot = cache(
  async (tenantId: string): Promise<TenantEmailOperatorSnapshot | null> => {
    const [tenant, delivery, emailSettings, identity, domains] = await Promise.all([
      getTenantById(tenantId),
      getTenantEmailDelivery(tenantId),
      getEmailSettingsForTenant(tenantId).catch(() => null),
      resolveTransactionalEmailIdentityForTenant(tenantId).catch(() => null),
      listTenantDomains(tenantId).catch(() => []),
    ]);

    if (!tenant) return null;

    const plan = getPlanConfig(tenant.plan_id);
    const platformConfig = getEmailDeliveryConfig();
    const keyResolution = await resolveTenantResendApiKeyForTenant(tenantId, tenant.slug);
    const effectiveMonthlyCap = effectiveMonthlySendCap(plan, delivery);
    const usagePeriodMonth = currentUtcMonthPeriod();
    const monthlySentCount = await getTenantEmailSentCountForMonth(
      tenantId,
      usagePeriodMonth,
    );
    const verifiedCustom = domains
      .filter(
        (d) =>
          d.verified &&
          d.routing_kind !== "hospira_subdomain" &&
          d.domain.trim().length > 0,
      )
      .map((d) => d.domain);

    const baseSendResolution = resolveTenantEmailSend(
      delivery,
      {
        platformResendConfigured: platformConfig.configured,
        platformMailDomain: platformMailDomain(),
      },
      {
        tenantSlug: tenant.slug,
        tenantResendApiKey: keyResolution.apiKey,
        tenantResendApiKeySource:
          keyResolution.source === "tenant_vault" ? "tenant_vault" : "tenant_env",
        emailEnabled: emailSettings?.email_enabled ?? true,
      },
    );

    const capBlocked =
      effectiveMonthlyCap != null && monthlySentCount >= effectiveMonthlyCap;
    const sendResolution =
      capBlocked && baseSendResolution.canSend
        ? {
            ...baseSendResolution,
            canSend: false,
            skipReason: "monthly_cap_exceeded" as const,
          }
        : baseSendResolution;

    return {
      delivery,
      planId: resolvePlanId(tenant.plan_id),
      slug: tenant.slug,
      effectiveMonthlyCap,
      platformResendConfigured: platformConfig.configured,
      platformMailDomain: platformMailDomain(),
      tenantResendEnvVar: tenantResendEnvKey(tenant.slug),
      tenantResendKeyPresent: Boolean(keyResolution.apiKey),
      vaultKeyHint: keyResolution.vaultHint,
      vaultKeySource: keyResolution.source,
      envFallbackPresent: keyResolution.envFallbackPresent,
      fromAddress: identity?.fromAddress ?? null,
      mailDomain: identity?.mailDomain ?? null,
      replyTo: identity?.defaultReplyTo ?? null,
      emailEnabled: emailSettings?.email_enabled ?? true,
      verifiedCustomDomains: verifiedCustom,
      sendResolution,
      monthlySentCount,
      usagePeriodMonth,
    };
  },
);

export async function resolveTenantEmailSendForTenant(
  tenantId: string,
  slug: string,
): Promise<TenantEmailSendResolution & { apiKey: string | null; monthlyCap: number | null }> {
  const [delivery, emailSettings, tenant] = await Promise.all([
    getTenantEmailDelivery(tenantId),
    getEmailSettingsForTenant(tenantId).catch(() => null),
    getTenantById(tenantId),
  ]);

  const platformConfig = getEmailDeliveryConfig();
  const keyResolution = await resolveTenantResendApiKeyForTenant(tenantId, slug);
  const resolution = resolveTenantEmailSend(
    delivery,
    {
      platformResendConfigured: platformConfig.configured,
      platformMailDomain: platformMailDomain(),
    },
    {
      tenantSlug: slug,
      tenantResendApiKey: keyResolution.apiKey,
      tenantResendApiKeySource:
        keyResolution.source === "tenant_vault" ? "tenant_vault" : "tenant_env",
      emailEnabled: emailSettings?.email_enabled ?? true,
    },
  );

  let apiKey: string | null = null;
  if (resolution.canSend && resolution.provider === "resend") {
    if (
      resolution.apiKeySource === "tenant_env" ||
      resolution.apiKeySource === "tenant_vault"
    ) {
      apiKey = keyResolution.apiKey;
    } else if (resolution.apiKeySource === "platform_env") {
      apiKey = process.env.RESEND_API_KEY?.trim() ?? null;
    }
  }

  return { ...resolution, apiKey, monthlyCap: tenant ? effectiveMonthlySendCap(getPlanConfig(tenant.plan_id), delivery) : null };
}

export type UpdateTenantEmailDeliveryInput = {
  deliveryMode?: TenantEmailDeliveryMode;
  mailDomainOverride?: string | null;
  monthlySendCap?: number | null;
  byokConfigured?: boolean;
  operatorNotes?: string | null;
};

export async function updateTenantEmailDelivery(
  tenantId: string,
  input: UpdateTenantEmailDeliveryInput,
): Promise<{ success: boolean; error?: string }> {
  const current = await getTenantEmailDelivery(tenantId);
  const supabase = createPublicAdminClient();
  const payload = {
    tenant_id: tenantId,
    delivery_mode: input.deliveryMode ?? current.deliveryMode,
    mail_domain_override:
      input.mailDomainOverride !== undefined
        ? input.mailDomainOverride?.trim() || null
        : current.mailDomainOverride,
    monthly_send_cap:
      input.monthlySendCap !== undefined ? input.monthlySendCap : current.monthlySendCap,
    byok_configured:
      input.byokConfigured !== undefined ? input.byokConfigured : current.byokConfigured,
    operator_notes:
      input.operatorNotes !== undefined
        ? input.operatorNotes?.trim() || null
        : current.operatorNotes,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("tenant_email_delivery")
    .upsert(payload, { onConflict: "tenant_id" });

  if (error) return { success: false, error: error.message };
  return { success: true };
}
