import type { TenantCountry } from "@/domain/fiscal/country-fiscal-profile";
import { createPublicAdminClient } from "@/lib/supabase/admin";
import { resolveTenantIdForData } from "@/lib/tenant/resolve-id";
import { resolveTenantCountryForRequest } from "@/lib/tenant/resolve-fiscal-tenant";
import type {
  FiscalSubmissionStatus,
  FiscalSubmitContext,
} from "@/domain/fiscal/fiscal-provider";
import { createAnafFiscalProvider } from "@/domain/fiscal/providers/anaf-stub";
import {
  buildIdempotencyKey,
  buildPayloadHash,
  canPollFiscalJob,
  canSubmitFiscalJob,
  canTransitionFiscalStatus,
  hasActiveFiscalJob,
  isFiscalRetryEligible,
  isTerminalFiscalStatus,
  resolveStatusAfterSubmit,
} from "@/domain/fiscal/submission-status";
import type { IssuedInvoiceDocument } from "@/domain/invoice/issued-invoice";
import {
  getAnafRuntimeConfig,
  shouldEnqueueAnafSubmission,
} from "@/lib/fiscal/anaf-config";
import { logTenantActivity } from "@/services/activity-log";
import { getTenantFiscalSettingsForTenant } from "@/services/tenant-fiscal-settings";

export type FiscalSubmissionJobRecord = {
  id: string;
  tenantId: string;
  bookingInvoiceId: string;
  status: FiscalSubmissionStatus;
  attemptCount: number;
  maxAttempts: number;
  lastError: string | null;
  anafUploadId: string | null;
  submittedAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type JobRow = Record<string, unknown>;

function mapJobRow(row: JobRow): FiscalSubmissionJobRecord {
  const status = String(row.status) as FiscalSubmissionStatus;
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    bookingInvoiceId: String(row.booking_invoice_id),
    status,
    attemptCount: Number(row.attempt_count ?? 0),
    maxAttempts: Number(row.max_attempts ?? 5),
    lastError: row.last_error != null ? String(row.last_error) : null,
    anafUploadId: row.anaf_upload_id != null ? String(row.anaf_upload_id) : null,
    submittedAt: row.submitted_at != null ? String(row.submitted_at) : null,
    resolvedAt: row.resolved_at != null ? String(row.resolved_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

async function resolveTenantCountryById(
  tenantId: string
): Promise<TenantCountry> {
  const supabase = createPublicAdminClient();
  const { data } = await supabase
    .from("tenants")
    .select("country")
    .eq("id", tenantId)
    .maybeSingle();
  if (data?.country === "BG" || data?.country === "MD") return data.country;
  return "RO";
}

function isJobsTableMissing(message: string): boolean {
  return (
    message.includes("fiscal_submission_jobs") ||
    message.includes("tenant_fiscal_settings")
  );
}

function documentFromInvoiceRow(row: JobRow): IssuedInvoiceDocument | null {
  const lines = Array.isArray(row.lines) ? row.lines : [];
  const currency =
    row.currency === "BGN" || row.currency === "MDL" ? row.currency : "RON";
  if (!row.series || row.invoice_number == null) return null;
  return {
    series: String(row.series),
    invoice_number: Number(row.invoice_number),
    display_number: String(row.display_number),
    issued_at: String(row.issued_at ?? row.created_at ?? new Date().toISOString()),
    seller_name: String(row.seller_name ?? ""),
    seller_cui: row.seller_cui != null ? String(row.seller_cui) : null,
    seller_reg_com:
      row.seller_reg_com != null ? String(row.seller_reg_com) : null,
    seller_address:
      row.seller_address != null ? String(row.seller_address) : null,
    buyer_name: String(row.buyer_name ?? ""),
    buyer_email: String(row.buyer_email ?? ""),
    buyer_phone: row.buyer_phone != null ? String(row.buyer_phone) : null,
    check_in: String(row.check_in ?? ""),
    check_out: String(row.check_out ?? ""),
    nights: 1,
    lines: lines as IssuedInvoiceDocument["lines"],
    subtotal: Number(row.subtotal ?? 0),
    subtotal_net: Number(row.subtotal_net ?? row.subtotal ?? 0),
    vat_rate: row.vat_rate != null ? Number(row.vat_rate) : 0,
    vat_amount: row.vat_amount != null ? Number(row.vat_amount) : 0,
    total: Number(row.total ?? 0),
    currency,
    prices_include_vat: true,
    uses_recorded_total: false,
    legal_note: "",
  };
}

async function syncInvoiceFiscalStatus(
  tenantId: string,
  invoiceId: string,
  status: FiscalSubmissionStatus | null
): Promise<void> {
  const supabase = createPublicAdminClient();
  const { error } = await supabase
    .from("booking_invoices")
    .update({ fiscal_status: status })
    .eq("tenant_id", tenantId)
    .eq("id", invoiceId);
  if (error && !error.message.includes("fiscal_status")) {
    console.error("[fiscal-submission] sync status", error.message);
  }
}

async function logFiscalActivity(
  tenantId: string,
  bookingId: string | null,
  invoiceId: string,
  displayNumber: string,
  action: "fiscal.submitted" | "fiscal.accepted" | "fiscal.rejected",
  metadata: Record<string, unknown> = {}
): Promise<void> {
  const summaries: Record<typeof action, string> = {
    "fiscal.submitted": `ANAF: transmis ${displayNumber}`,
    "fiscal.accepted": `ANAF: acceptat ${displayNumber}`,
    "fiscal.rejected": `ANAF: respins ${displayNumber}`,
  };
  await logTenantActivity(tenantId, {
    action,
    entityType: "booking",
    entityId: bookingId,
    summary: summaries[action],
    metadata: { invoice_id: invoiceId, display_number: displayNumber, ...metadata },
  });
}

export async function enqueueFiscalSubmission(
  invoiceId: string,
  tenantId?: string
): Promise<{ ok: true; jobId: string } | { ok: false; error: string }> {
  const resolvedTenantId = tenantId ?? (await resolveTenantIdForData());
  const [settings, tenantCountry] = await Promise.all([
    getTenantFiscalSettingsForTenant(resolvedTenantId),
    tenantId != null
      ? resolveTenantCountryById(resolvedTenantId)
      : resolveTenantCountryForRequest(),
  ]);

  if (!shouldEnqueueAnafSubmission(settings, tenantCountry)) {
    return { ok: false, error: "fiscal.not_anaf_provider" };
  }

  const supabase = createPublicAdminClient();
  const { data: invoice, error: invoiceError } = await supabase
    .from("booking_invoices")
    .select("*")
    .eq("tenant_id", resolvedTenantId)
    .eq("id", invoiceId)
    .maybeSingle();

  if (invoiceError) {
    if (isJobsTableMissing(invoiceError.message)) {
      return { ok: false, error: "fiscal.migration_required" };
    }
    return { ok: false, error: invoiceError.message };
  }
  if (!invoice) return { ok: false, error: "fiscal.invoice_not_found" };

  const document = documentFromInvoiceRow(invoice as JobRow);
  if (!document) return { ok: false, error: "fiscal.invalid_invoice" };

  const idempotencyKey = buildIdempotencyKey(resolvedTenantId, invoiceId);
  const payloadHash = buildPayloadHash(document);

  const { data: existingJobs, error: existingError } = await supabase
    .from("fiscal_submission_jobs")
    .select("*")
    .eq("tenant_id", resolvedTenantId)
    .eq("booking_invoice_id", invoiceId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (existingError) {
    if (isJobsTableMissing(existingError.message)) {
      return { ok: false, error: "fiscal.migration_required" };
    }
    return { ok: false, error: existingError.message };
  }

  const latest = existingJobs?.[0]
    ? mapJobRow(existingJobs[0] as JobRow)
    : null;
  if (latest && hasActiveFiscalJob(latest.status)) {
    return { ok: false, error: "fiscal.job_already_active" };
  }
  if (latest && latest.status === "accepted") {
    return { ok: false, error: "fiscal.already_accepted" };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("fiscal_submission_jobs")
    .insert({
      tenant_id: resolvedTenantId,
      booking_invoice_id: invoiceId,
      idempotency_key: idempotencyKey,
      status: "pending",
      payload_hash: payloadHash,
    })
    .select("*")
    .single();

  if (insertError) {
    if (insertError.message.includes("fiscal_submission_jobs_idempotency")) {
      return { ok: false, error: "fiscal.job_already_active" };
    }
    if (isJobsTableMissing(insertError.message)) {
      return { ok: false, error: "fiscal.migration_required" };
    }
    return { ok: false, error: insertError.message };
  }

  await syncInvoiceFiscalStatus(resolvedTenantId, invoiceId, "pending");
  return { ok: true, jobId: String(inserted.id) };
}

export async function getFiscalStatusForInvoice(
  invoiceId: string
): Promise<FiscalSubmissionStatus | null> {
  const tenantId = await resolveTenantIdForData();
  const supabase = createPublicAdminClient();

  const { data: invoice, error: invoiceError } = await supabase
    .from("booking_invoices")
    .select("fiscal_status")
    .eq("tenant_id", tenantId)
    .eq("id", invoiceId)
    .maybeSingle();

  if (invoiceError) {
    if (invoiceError.message.includes("fiscal_status")) return null;
    throw new Error(invoiceError.message);
  }

  if (invoice?.fiscal_status) {
    return String(invoice.fiscal_status) as FiscalSubmissionStatus;
  }

  const { data: job, error: jobError } = await supabase
    .from("fiscal_submission_jobs")
    .select("status")
    .eq("tenant_id", tenantId)
    .eq("booking_invoice_id", invoiceId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (jobError) {
    if (isJobsTableMissing(jobError.message)) return null;
    throw new Error(jobError.message);
  }

  return job?.status ? (String(job.status) as FiscalSubmissionStatus) : null;
}

export async function getFiscalStatusMapForInvoices(
  invoiceIds: string[]
): Promise<Record<string, FiscalSubmissionStatus>> {
  if (invoiceIds.length === 0) return {};
  const tenantId = await resolveTenantIdForData();
  const supabase = createPublicAdminClient();

  const { data, error } = await supabase
    .from("booking_invoices")
    .select("id, fiscal_status")
    .eq("tenant_id", tenantId)
    .in("id", invoiceIds);

  if (error) {
    if (error.message.includes("fiscal_status")) return {};
    throw new Error(error.message);
  }

  const map: Record<string, FiscalSubmissionStatus> = {};
  for (const row of data ?? []) {
    if (row.fiscal_status) {
      map[String(row.id)] = String(row.fiscal_status) as FiscalSubmissionStatus;
    }
  }
  return map;
}

type ProcessJobBundle = {
  job: FiscalSubmissionJobRecord;
  invoice: JobRow;
  document: IssuedInvoiceDocument;
  settings: Awaited<ReturnType<typeof getTenantFiscalSettingsForTenant>>;
};

async function loadJobBundle(jobRow: JobRow): Promise<ProcessJobBundle | null> {
  const job = mapJobRow(jobRow);
  const supabase = createPublicAdminClient();
  const { data: invoice, error } = await supabase
    .from("booking_invoices")
    .select("*")
    .eq("tenant_id", job.tenantId)
    .eq("id", job.bookingInvoiceId)
    .maybeSingle();

  if (error || !invoice) return null;
  const document = documentFromInvoiceRow(invoice as JobRow);
  if (!document) return null;

  const settings = await getTenantFiscalSettingsForTenant(job.tenantId);
  return { job, invoice: invoice as JobRow, document, settings };
}

function buildSubmitContext(bundle: ProcessJobBundle): FiscalSubmitContext {
  return {
    tenantId: bundle.job.tenantId,
    invoiceId: bundle.job.bookingInvoiceId,
    document: bundle.document,
    settings: {
      provider: bundle.settings.provider,
      anafEnabled: bundle.settings.anafEnabled,
      anafCif: bundle.settings.anafCif,
      anafEnv: bundle.settings.anafEnv,
    },
  };
}

async function applyJobUpdate(
  bundle: ProcessJobBundle,
  nextStatus: FiscalSubmissionStatus,
  patch: Partial<{
    last_error: string | null;
    anaf_upload_id: string | null;
    submitted_at: string | null;
    resolved_at: string | null;
    attempt_count: number;
  }>
): Promise<void> {
  const { job, invoice } = bundle;
  if (!canTransitionFiscalStatus(job.status, nextStatus)) {
    throw new Error(`fiscal.invalid_transition:${job.status}->${nextStatus}`);
  }

  const supabase = createPublicAdminClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("fiscal_submission_jobs")
    .update({
      status: nextStatus,
      last_error: patch.last_error ?? null,
      anaf_upload_id: patch.anaf_upload_id ?? job.anafUploadId,
      submitted_at: patch.submitted_at ?? job.submittedAt,
      resolved_at: patch.resolved_at ?? (isTerminalFiscalStatus(nextStatus) ? now : null),
      attempt_count: patch.attempt_count ?? job.attemptCount,
    })
    .eq("tenant_id", job.tenantId)
    .eq("id", job.id);

  if (error) throw new Error(error.message);

  await syncInvoiceFiscalStatus(job.tenantId, job.bookingInvoiceId, nextStatus);

  const bookingId =
    invoice.booking_id != null ? String(invoice.booking_id) : null;
  const displayNumber = String(invoice.display_number ?? job.bookingInvoiceId);

  if (nextStatus === "submitted" && job.status !== "submitted") {
    await logFiscalActivity(
      job.tenantId,
      bookingId,
      job.bookingInvoiceId,
      displayNumber,
      "fiscal.submitted",
      { upload_id: patch.anaf_upload_id ?? job.anafUploadId }
    );
  }
  if (nextStatus === "accepted") {
    await logFiscalActivity(
      job.tenantId,
      bookingId,
      job.bookingInvoiceId,
      displayNumber,
      "fiscal.accepted"
    );
  }
  if (nextStatus === "rejected") {
    await logFiscalActivity(
      job.tenantId,
      bookingId,
      job.bookingInvoiceId,
      displayNumber,
      "fiscal.rejected",
      { error: patch.last_error ?? job.lastError }
    );
  }
}

async function processSingleJob(bundle: ProcessJobBundle): Promise<void> {
  const provider = createAnafFiscalProvider(getAnafRuntimeConfig());
  const ctx = buildSubmitContext(bundle);
  const { job } = bundle;

  if (
    job.status === "failed" &&
    isFiscalRetryEligible({
      status: job.status,
      attemptCount: job.attemptCount,
      maxAttempts: job.maxAttempts,
      updatedAt: job.updatedAt,
    })
  ) {
    await applyJobUpdate(bundle, "pending", {});
    bundle.job = { ...job, status: "pending" };
  }

  if (canSubmitFiscalJob(bundle.job.status)) {
    const result = await provider.submitInvoice(ctx);
    const nextStatus = resolveStatusAfterSubmit(result);
    await applyJobUpdate(bundle, nextStatus, {
      attempt_count: bundle.job.attemptCount + 1,
      last_error: result.error ?? null,
      anaf_upload_id: result.uploadId ?? null,
      submitted_at:
        nextStatus === "submitted" || nextStatus === "accepted"
          ? new Date().toISOString()
          : null,
    });
    return;
  }

  if (canPollFiscalJob(bundle.job.status) && bundle.job.anafUploadId) {
    const result = await provider.pollStatus({
      ...ctx,
      uploadId: bundle.job.anafUploadId,
      attemptCount: bundle.job.attemptCount,
    });
    const nextStatus = resolveStatusAfterSubmit(result);
    await applyJobUpdate(bundle, nextStatus, {
      attempt_count: bundle.job.attemptCount + 1,
      last_error: result.error ?? null,
      resolved_at: isTerminalFiscalStatus(nextStatus)
        ? new Date().toISOString()
        : null,
    });
  }
}

export type ProcessPendingFiscalJobsResult = {
  processed: number;
  failed: number;
  skipped: number;
};

export async function processPendingFiscalJobs(
  limit = 25
): Promise<ProcessPendingFiscalJobsResult> {
  const supabase = createPublicAdminClient();
  // cross-tenant cron batch — each job row carries tenant_id; filtered when applied
  const { data: jobs, error } = await supabase
    .from("fiscal_submission_jobs")
    .select("*")
    .in("status", ["pending", "submitted", "failed"])
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    if (isJobsTableMissing(error.message)) {
      return { processed: 0, failed: 0, skipped: 0 };
    }
    throw new Error(error.message);
  }

  let processed = 0;
  let failed = 0;
  let skipped = 0;

  for (const row of jobs ?? []) {
    const bundle = await loadJobBundle(row as JobRow);
    if (!bundle) {
      skipped += 1;
      continue;
    }
    try {
      await processSingleJob(bundle);
      processed += 1;
    } catch (e) {
      failed += 1;
      console.error("[fiscal-submission] job failed", bundle.job.id, e);
    }
  }

  return { processed, failed, skipped };
}
