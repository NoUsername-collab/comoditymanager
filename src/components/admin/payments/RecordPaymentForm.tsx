"use client";

import { useId, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { recordPaymentAction } from "@/app/[locale]/admin/(panel)/bookings/payment-actions";
import { useAdminFx } from "@/components/admin/feedback/AdminToastProvider";
import type { PaymentMethod } from "@/domain/payments/types";

type Props = {
  bookingId: string;
  balanceDue: number;
};

const METHODS: PaymentMethod[] = [
  "cash",
  "card",
  "transfer",
  "online",
  "other",
];

export function RecordPaymentForm({ bookingId, balanceDue }: Props) {
  const t = useTranslations("admin.financial");
  const { showToast } = useAdminFx();
  const router = useRouter();
  const formId = useId();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [amount, setAmount] = useState(
    balanceDue > 0 ? String(Math.round(balanceDue * 100) / 100) : ""
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const fd = new FormData(e.currentTarget);
    fd.set("idempotency_key", `${bookingId}:${Date.now()}`);
    const result = await recordPaymentAction(bookingId, fd);
    setPending(false);
    if (!result.ok) {
      showToast({ kind: "error", title: t("recordError"), message: result.error });
      return;
    }
    showToast({ kind: "success", title: t("recordSuccess") });
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        type="button"
        className="stay-financial__record-btn"
        onClick={() => setOpen(true)}
      >
        {t("recordPayment")}
      </button>
    );
  }

  return (
    <form
      className="stay-financial__record-form admin-surface-card"
      onSubmit={handleSubmit}
      aria-labelledby={`${formId}-title`}
    >
      <p id={`${formId}-title`} className="stay-financial__record-title">
        {t("recordPayment")}
      </p>
      <label className="stay-financial__field">
        <span>{t("amount")}</span>
        <input
          name="amount"
          type="number"
          min="0.01"
          step="0.01"
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="admin-input"
        />
      </label>
      <label className="stay-financial__field">
        <span>{t("method")}</span>
        <select name="method" defaultValue="cash" className="admin-input">
          {METHODS.map((m) => (
            <option key={m} value={m}>
              {t(`method_${m}`)}
            </option>
          ))}
        </select>
      </label>
      <label className="stay-financial__field">
        <span>{t("payerName")}</span>
        <input
          name="payer_name"
          type="text"
          className="admin-input"
          placeholder={t("payerNamePlaceholder")}
        />
      </label>
      <label className="stay-financial__field">
        <span>{t("notes")}</span>
        <input name="notes" type="text" className="admin-input" />
      </label>
      <div className="stay-financial__record-actions">
        <button
          type="button"
          className="admin-btn admin-btn--ghost"
          onClick={() => setOpen(false)}
          disabled={pending}
        >
          {t("cancel")}
        </button>
        <button
          type="submit"
          className="admin-btn admin-btn--primary"
          disabled={pending}
        >
          {pending ? t("saving") : t("savePayment")}
        </button>
      </div>
    </form>
  );
}
