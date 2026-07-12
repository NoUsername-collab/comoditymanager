import type { PlanConfig } from "@/core/config/plans";

/** How outbound email is delivered for a tenant. */
export type TenantEmailDeliveryMode = "platform" | "tenant_resend" | "disabled";

export type TenantEmailDeliveryRecord = {
  deliveryMode: TenantEmailDeliveryMode;
  mailDomainOverride: string | null;
  monthlySendCap: number | null;
  byokConfigured: boolean;
  operatorNotes: string | null;
};

export type PlatformEmailInfra = {
  platformResendConfigured: boolean;
  platformMailDomain: string | null;
};

export type TenantEmailIdentityHints = {
  fromAddress: string | null;
  mailDomain: string | null;
  hasVerifiedCustomDomain: boolean;
  emailEnabled: boolean;
};

export type TenantEmailSendResolution = {
  canSend: boolean;
  skipReason?: "disabled" | "platform_unconfigured" | "byok_missing" | "tenant_email_disabled" | "monthly_cap_exceeded";
  effectiveMode: TenantEmailDeliveryMode | "noop";
  provider: "resend" | "noop";
  apiKeySource: "platform_env" | "tenant_env" | "tenant_vault" | "none";
};

export const DEFAULT_TENANT_EMAIL_DELIVERY: TenantEmailDeliveryRecord = {
  deliveryMode: "platform",
  mailDomainOverride: null,
  monthlySendCap: null,
  byokConfigured: false,
  operatorNotes: null,
};

/** Plan-level monthly cap; null = unlimited. */
export function planEmailMonthlyCap(plan: PlanConfig): number | null {
  return plan.emailMonthlyCap;
}

export function effectiveMonthlySendCap(
  plan: PlanConfig,
  delivery: TenantEmailDeliveryRecord,
): number | null {
  if (delivery.monthlySendCap != null) return delivery.monthlySendCap;
  return planEmailMonthlyCap(plan);
}

export function resolveTenantEmailSend(
  delivery: TenantEmailDeliveryRecord,
  platform: PlatformEmailInfra,
  options: {
    tenantSlug: string;
    tenantResendApiKey?: string | null;
    tenantResendApiKeySource?: "tenant_vault" | "tenant_env";
    emailEnabled?: boolean;
  },
): TenantEmailSendResolution {
  if (options.emailEnabled === false) {
    return {
      canSend: false,
      skipReason: "tenant_email_disabled",
      effectiveMode: "noop",
      provider: "noop",
      apiKeySource: "none",
    };
  }

  if (delivery.deliveryMode === "disabled") {
    return {
      canSend: false,
      skipReason: "disabled",
      effectiveMode: "noop",
      provider: "noop",
      apiKeySource: "none",
    };
  }

  if (delivery.deliveryMode === "tenant_resend") {
    const tenantKey = options.tenantResendApiKey?.trim();
    if (tenantKey) {
      return {
        canSend: true,
        effectiveMode: "tenant_resend",
        provider: "resend",
        apiKeySource: options.tenantResendApiKeySource ?? "tenant_env",
      };
    }
    return {
      canSend: false,
      skipReason: "byok_missing",
      effectiveMode: "tenant_resend",
      provider: "noop",
      apiKeySource: "none",
    };
  }

  if (!platform.platformResendConfigured) {
    return {
      canSend: false,
      skipReason: "platform_unconfigured",
      effectiveMode: "platform",
      provider: "noop",
      apiKeySource: "none",
    };
  }

  return {
    canSend: true,
    effectiveMode: "platform",
    provider: "resend",
    apiKeySource: "platform_env",
  };
}

export function tenantResendEnvKey(slug: string): string {
  const normalized = slug.trim().toUpperCase().replace(/[^A-Z0-9]/g, "_");
  return `RESEND_API_KEY_TENANT__${normalized}`;
}

export function readTenantResendApiKey(slug: string): string | null {
  const key = tenantResendEnvKey(slug);
  const value = process.env[key]?.trim();
  return value || null;
}
