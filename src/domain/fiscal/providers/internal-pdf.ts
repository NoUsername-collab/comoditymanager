import type {
  FiscalPollContext,
  FiscalProvider,
  FiscalSubmitContext,
  FiscalSubmitResult,
} from "../fiscal-provider";

/** Local PDF only - no external fiscal authority submission. */
export const internalPdfProvider: FiscalProvider = {
  type: "internal_pdf",

  async submitInvoice(_ctx: FiscalSubmitContext): Promise<FiscalSubmitResult> {
    return { status: "accepted", uploadId: null };
  },

  async pollStatus(_ctx: FiscalPollContext): Promise<FiscalSubmitResult> {
    return { status: "accepted", uploadId: null };
  },
};