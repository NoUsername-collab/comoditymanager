"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { getTranslations } from "next-intl/server";
import { cachedStaffContext, requireStaff } from "@/lib/auth/require-staff";
import { CACHE_TAGS, tenantTag } from "@/lib/cache-tags";
import { ensureTenantContextFromRequest } from "@/lib/tenant/bind-request-context";
import { resolveTenantIdForData } from "@/lib/tenant/resolve-id";
import type { PaymentMethod } from "@/domain/payments/types";
import { logAdminActivityFromSession } from "@/services/activity-log";
import {
  listBookingPayments,
  recordBookingPayment,
} from "@/services/booking-payments";
import { loadFinancialSnapshot } from "@/services/booking-financial";
import { getBookingById } from "@/services/bookings";
import { assertBookingPostCheckoutEditAllowed } from "@/services/bookings/post-checkout-guard";

function parseMethod(raw: FormDataEntryValue | null): PaymentMethod {
  const v = String(raw ?? "cash");
  if (v === "card" || v === "transfer" || v === "online" || v === "other") {
    return v;
  }
  return "cash";
}

export async function loadFinancialSnapshotAction(bookingId: string) {
  await requireStaff();
  const snapshot = await loadFinancialSnapshot(bookingId);
  if (!snapshot) {
    const t = await getTranslations("admin.serverActions");
    return { ok: false as const, error: t("bookingNotFound") };
  }
  return { ok: true as const, snapshot };
}

export async function recordPaymentAction(
  bookingId: string,
  formData: FormData
): Promise<{ ok: true } | { ok: false; error: string }> {
  await ensureTenantContextFromRequest();
  await requireStaff();
  const t = await getTranslations("admin.financial");

  const booking = await getBookingById(bookingId);
  if (!booking) {
    const tErr = await getTranslations("admin.serverActions");
    return { ok: false, error: tErr("bookingNotFound") };
  }
  await assertBookingPostCheckoutEditAllowed(booking);

  const amount = Number(formData.get("amount"));
  const method = parseMethod(formData.get("method"));
  const payerName = String(formData.get("payer_name") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  const ctx = await cachedStaffContext();
  const result = await recordBookingPayment({
    bookingId,
    amount,
    method,
    payerName,
    notes,
    recordedBy: ctx.user?.id ?? null,
    idempotencyKey: String(formData.get("idempotency_key") ?? "").trim() || null,
  });

  if (!result.ok) {
    const key = result.error;
    const mapped =
      key === "payment.invalid_amount"
        ? t("invalidAmount")
        : key === "payment.booking_not_confirmed"
          ? t("bookingNotConfirmed")
          : key === "payment.migration_required"
            ? t("migrationRequired")
            : key;
    return { ok: false, error: mapped };
  }

  const entry = result.entry;
  await logAdminActivityFromSession({
    action: entry.kind === "refund" ? "payment.refunded" : "payment.recorded",
    entityType: "booking",
    entityId: bookingId,
    summary:
      entry.kind === "refund"
        ? `Rambursare ${entry.amount} (${method})`
        : `Încasare ${entry.amount} (${method})`,
    metadata: {
      payment_id: entry.id,
      amount: entry.amount,
      method,
      payer_name: payerName,
    },
  });

  const tenantId = await resolveTenantIdForData();
  revalidateTag(tenantTag(tenantId, CACHE_TAGS.checkins), "max");
  revalidateTag(CACHE_TAGS.bookingPayments, "max");
  revalidatePath(`/admin/bookings/${bookingId}`);
  revalidatePath("/admin/cazari");

  return { ok: true };
}

export async function listBookingPaymentsAction(bookingId: string) {
  await requireStaff();
  const payments = await listBookingPayments(bookingId);
  return { ok: true as const, payments };
}
