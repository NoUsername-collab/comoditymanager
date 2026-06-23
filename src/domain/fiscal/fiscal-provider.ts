import type { IssuedInvoiceDocument } from "@/domain/invoice/issued-invoice";

export type FiscalProviderType = "internal_pdf" | "anaf";

export type AnafEnvironment = "test" | "prod";

export type FiscalSubmissionStatus =
  | "pending"
  | "submitted"
  | "accepted"
  | "rejected"
  | "failed";

export type FiscalSubmitResult = {
  status: Exclude<FiscalSubmissionStatus, "pending">;
  uploadId?: string | null;
  error?: string | null;
};

export type TenantFiscalProviderSettings = {
  provider: FiscalProviderType;
  anafEnabled: boolean;
  anafCif: string | null;
  anafEnv: AnafEnvironment;
};

export type FiscalSubmitContext = {
  tenantId: string;
  invoiceId: string;
  document: IssuedInvoiceDocument;
  settings: TenantFiscalProviderSettings;
};

export type FiscalPollContext = FiscalSubmitContext & {
  uploadId: string;
  attemptCount: number;
};

export interface FiscalProvider {
  readonly type: FiscalProviderType;
  submitInvoice(ctx: FiscalSubmitContext): Promise<FiscalSubmitResult>;
  pollStatus(ctx: FiscalPollContext): Promise<FiscalSubmitResult>;
}
