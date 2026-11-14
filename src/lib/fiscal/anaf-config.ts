import type { AnafEnvironment, FiscalProviderType } from "@/domain/fiscal/fiscal-provider";

export type TenantFiscalSettingsRecord = {
  tenantId: string;
  provider: FiscalProviderType;
  anafEnabled: boolean;
  anafCif: string | null;
  anafEnv: AnafEnvironment;
  anafCredentials: Record<string, unknown> | null;
};

/**
 * The pretend ANAF used to exercise the queue in development and tests. It
 * answers "accepted" without sending anything, so it is never used on the live
 * site, and only when asked for by name (missing keys no longer turn it on).
 */
function isAnafStubMode(): boolean {
  return process.env.ANAF_STUB === "true" && process.env.VERCEL_ENV !== "production";
}

/**
 * Whether invoices can be sent to ANAF from here at all. The real upload (SPV
 * OAuth and the UBL file) is not built yet, so only the development stub
 * counts; until then the option is not offered and nothing is queued.
 */
export function isAnafSubmissionAvailable(): boolean {
  return isAnafStubMode();
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
    isAnafSubmissionAvailable() &&
    tenantCountry === "RO" &&
    settings.provider === "anaf" &&
    settings.anafEnabled
  );
}
