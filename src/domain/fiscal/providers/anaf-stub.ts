import type {
  FiscalPollContext,
  FiscalProvider,
  FiscalSubmitContext,
  FiscalSubmitResult,
} from "../fiscal-provider";

export type AnafProviderRuntimeConfig = {
  stubMode: boolean;
  clientId?: string | null;
  clientSecret?: string | null;
};

function stubUploadId(invoiceId: string): string {
  return `stub-${invoiceId.replace(/-/g, "").slice(0, 12)}`;
}

function buildAnafProvider(config: AnafProviderRuntimeConfig): FiscalProvider {
  return {
    type: "anaf",

    async submitInvoice(ctx: FiscalSubmitContext): Promise<FiscalSubmitResult> {
      if (config.stubMode) {
        return {
          status: "submitted",
          uploadId: stubUploadId(ctx.invoiceId),
        };
      }

      if (!config.clientId?.trim() || !config.clientSecret?.trim()) {
        return {
          status: "failed",
          error: "anaf.credentials_missing",
        };
      }

      // Production OAuth + UBL upload will plug in here (out of P4 scope).
      return {
        status: "failed",
        error: "anaf.not_implemented",
      };
    },

    async pollStatus(ctx: FiscalPollContext): Promise<FiscalSubmitResult> {
      if (config.stubMode) {
        if (ctx.uploadId.startsWith("stub-")) {
          if (ctx.attemptCount >= 1) {
            return { status: "accepted", uploadId: ctx.uploadId };
          }
          return { status: "submitted", uploadId: ctx.uploadId };
        }
        return { status: "failed", error: "anaf.stub_invalid_upload_id" };
      }

      if (!config.clientId?.trim() || !config.clientSecret?.trim()) {
        return {
          status: "failed",
          error: "anaf.credentials_missing",
        };
      }

      return {
        status: "failed",
        error: "anaf.not_implemented",
      };
    },
  };
}

export function createAnafFiscalProvider(
  config: AnafProviderRuntimeConfig
): FiscalProvider {
  return buildAnafProvider(config);
}
