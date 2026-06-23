import { cache } from "react";
import { revalidateTag } from "next/cache";
import { CACHE_TAGS, tenantTag } from "@/lib/cache-tags";
import { createPublicAdminClient } from "@/lib/supabase/admin";
import { resolveTenantIdForData } from "@/lib/tenant/resolve-id";
import { getTenantScope } from "@/lib/tenant/scope";
import {
  computePaymentTotals,
  paymentDeltaToTarget,
  roundMoney,
  sumLedgerPayments,
} from "@/domain/payments/ledger";
import type {
  PaymentEntry,
  PaymentLedgerKind,
  PaymentMethod,
  PaymentTotals,
} from "@/domain/payments/types";
import type { StoredPaymentStatus } from "@/domain/checkin/types";
import { getBookingById } from "@/services/bookings";

function isBookingPaymentsTableMissing(message: string): boolean {
  return message.includes("booking_payments");
}

function mapPaymentRow(row: Record<string, unknown>): PaymentEntry {
  const kind = row.kind === "refund" ? "refund" : "payment";
  const method = row.method;
  const validMethod: PaymentMethod =
    method === "card" ||
    method === "transfer" ||
    method === "online" ||
    method === "other"
      ? method
      : "cash";

  return {
    id: String(row.id),
    booking_id: String(row.booking_id),
    amount: Number(row.amount),
    kind,
    method: validMethod,
    payer_name: row.payer_name != null ? String(row.payer_name) : null,
    payer_tax_id: row.payer_tax_id != null ? String(row.payer_tax_id) : null,
    paid_at: String(row.paid_at),
    recorded_by: row.recorded_by != null ? String(row.recorded_by) : null,
    notes: row.notes != null ? String(row.notes) : null,
    invoice_id: row.invoice_id != null ? String(row.invoice_id) : null,
  };
}

export const listBookingPayments = cache(async (
  bookingId: string
): Promise<PaymentEntry[]> => {
  const tenantId = await resolveTenantIdForData();
  const supabase = createPublicAdminClient();
  const { data, error } = await supabase
    .from("booking_payments")
    .select(
      "id, booking_id, amount, kind, method, payer_name, payer_tax_id, paid_at, recorded_by, notes, invoice_id"
    )
    .eq("tenant_id", tenantId)
    .eq("booking_id", bookingId)
    .order("paid_at", { ascending: true });

  if (error) {
    if (isBookingPaymentsTableMissing(error.message)) return [];
    throw new Error(error.message);
  }

  return (data ?? []).map((row) =>
    mapPaymentRow(row as Record<string, unknown>)
  );
});

export async function getBookingPaymentTotals(
  bookingId: string,
  totalDue?: number | null
): Promise<PaymentTotals> {
  const [payments, booking] = await Promise.all([
    listBookingPayments(bookingId),
    totalDue != null ? Promise.resolve(null) : getBookingById(bookingId),
  ]);
  const due =
    totalDue != null
      ? roundMoney(Math.max(0, totalDue))
      : roundMoney(Math.max(0, Number(booking?.total_price ?? 0)));
  return computePaymentTotals(due, payments);
}

export type RecordBookingPaymentInput = {
  bookingId: string;
  amount: number;
  kind?: PaymentLedgerKind;
  method?: PaymentMethod;
  payerName?: string | null;
  payerTaxId?: string | null;
  notes?: string | null;
  paidAt?: string;
  recordedBy?: string | null;
  idempotencyKey?: string | null;
};

export async function recordBookingPayment(
  input: RecordBookingPaymentInput
): Promise<{ ok: true; entry: PaymentEntry } | { ok: false; error: string }> {
  const amount = roundMoney(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "payment.invalid_amount" };
  }

  const booking = await getBookingById(input.bookingId);
  if (!booking) return { ok: false, error: "booking.not_found" };
  if (booking.status !== "confirmata") {
    return { ok: false, error: "payment.booking_not_confirmed" };
  }

  const tenantId = await resolveTenantIdForData();
  const supabase = createPublicAdminClient();
  const kind: PaymentLedgerKind = input.kind ?? "payment";

  const { data, error } = await supabase
    .from("booking_payments")
    .insert({
      tenant_id: tenantId,
      booking_id: input.bookingId,
      amount,
      kind,
      method: input.method ?? "cash",
      payer_name: input.payerName?.trim() || null,
      payer_tax_id: input.payerTaxId?.trim() || null,
      paid_at: input.paidAt ?? new Date().toISOString(),
      recorded_by: input.recordedBy ?? null,
      notes: input.notes?.trim() || null,
      idempotency_key: input.idempotencyKey?.trim() || null,
    })
    .select(
      "id, booking_id, amount, kind, method, payer_name, payer_tax_id, paid_at, recorded_by, notes, invoice_id"
    )
    .single();

  if (error) {
    if (isBookingPaymentsTableMissing(error.message)) {
      return { ok: false, error: "payment.migration_required" };
    }
    return { ok: false, error: error.message };
  }

  const entry = mapPaymentRow(data as Record<string, unknown>);
  await syncCheckinPaymentSnapshot(input.bookingId, booking.total_price ?? 0);
  revalidateTag(tenantTag(tenantId, CACHE_TAGS.checkins), "max");
  revalidateTag(CACHE_TAGS.bookingPayments, "max");

  return { ok: true, entry };
}

/** Ajustează ledger-ul la o sumă țintă (flux check-in existent). */
export async function applyBookingPaymentTarget(
  bookingId: string,
  targetPaid: number,
  meta?: {
    method?: PaymentMethod;
    recordedBy?: string | null;
    idempotencyKey?: string | null;
  }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const payments = await listBookingPayments(bookingId);
  const delta = paymentDeltaToTarget(payments, targetPaid);
  if (!delta) {
    await syncCheckinPaymentSnapshot(bookingId);
    return { ok: true };
  }

  return recordBookingPayment({
    bookingId,
    amount: delta.amount,
    kind: delta.kind,
    method: meta?.method ?? "cash",
    recordedBy: meta?.recordedBy ?? null,
    idempotencyKey: meta?.idempotencyKey ?? null,
  }).then((r) => (r.ok ? { ok: true as const } : r));
}

export async function syncCheckinPaymentSnapshot(
  bookingId: string,
  totalDue?: number | null
): Promise<void> {
  const { tenantId, supabase } = await getTenantScope();
  const payments = await listBookingPayments(bookingId);
  if (payments.length === 0) return;

  const totals = await getBookingPaymentTotals(bookingId, totalDue);
  const storedStatus: StoredPaymentStatus =
    totals.derivedStatus === "paid"
      ? "paid"
      : totals.derivedStatus === "partial"
        ? "partial"
        : "unpaid";

  const { error } = await supabase
    .from("checkins")
    .update({
      payment_status: storedStatus,
      payment_amount_paid: totals.totalPaid,
    })
    .eq("tenant_id", tenantId)
    .eq("booking_id", bookingId);

  if (error && !error.message.includes("checkins")) {
    throw new Error(error.message);
  }
}

export function ledgerTotalPaid(entries: PaymentEntry[]): number {
  return sumLedgerPayments(entries);
}
