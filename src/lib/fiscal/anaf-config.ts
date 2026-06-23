import type { AnafEnvironment, FiscalProviderType } from "@/domain/fiscal/fiscal-provider";

export type TenantFiscalSettingsRecord = {
  tenantId: string;
  provider: FiscalProviderType;
  anafEnabled: boolean;
  anafCif: string | null;
  anafEnv: AnafEnvironment;
  anafCredentials: Record<string, unknown> | null;
};

export function isAnafStubMode(): boolean {
  if (process.env.ANAF_STUB === "true") return true;
  const clientId = process.env.ANAF_CLIENT_ID?.trim();
  const clientSecret = process.env.ANAF_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return true;
  return false;
}

export function getAnafRuntimeConfig() {
  return {
    stubMode: isAnafStubMode(),
    clientId: process.env.ANAF_CLIENT_ID?.trim() ?? null,
    clientSecret: process.env.ANAF_CLIENT_SECRET?.trim() ?? null,
  };
}

export function shouldEnqueueAnafSubmission(
  settings: Pick<TenantFiscalSettingsRecord, "provider" | "anafEnabled">,
  tenantCountry: string | null | undefined
): boolean {
  return (
    tenantCountry === "RO" &&
    settings.provider === "anaf" &&
    settings.anafEnabled
  );
}
