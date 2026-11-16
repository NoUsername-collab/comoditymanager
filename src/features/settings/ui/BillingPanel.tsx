"use client";

import { useState, useTransition } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import {
  openBillingPortalAction,
  startSubscriptionCheckoutAction,
} from "@/features/settings/actions/billing";
import type { BillingSituation, CardPlanId } from "@/domain/billing/subscription";

type PlanOffer = { id: CardPlanId; label: string; priceEur: number };

type Props = {
  planLabel: string;
  situation: BillingSituation;
  /** Card payment is set up (Stripe keys present). */
  cardAvailable: boolean;
  /** The property has a Stripe customer, so the portal can open. */
  hasCustomer: boolean;
  /** Plans this property can buy now (none while it already pays by card or by arrangement). */
  offers: PlanOffer[];
  /** Returned from Stripe Checkout: "success" or "cancelled". */
  checkout: string | null;
};

export function BillingPanel({
  planLabel,
  situation,
  cardAvailable,
  hasCustomer,
  offers,
  checkout,
}: Props) {
  const t = useTranslations("admin.billing");
  const format = useFormatter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const day = (iso: string | null) =>
    iso ? format.dateTime(new Date(iso), { dateStyle: "long" }) : "—";

  function go(run: () => Promise<{ ok: true; url: string } | { ok: false; error: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await run();
      if (result.ok) window.location.assign(result.url);
      else setError(t(`errors.${result.error}`));
    });
  }

  const status = (() => {
    switch (situation.kind) {
      case "card":
        return t("statusCard", { date: day(situation.renewsOn) });
      case "cancelling":
        return t("statusCancelling", { date: day(situation.endsOn) });
      case "payment_failed":
        return t("statusPaymentFailed");
      case "pending":
        return t("statusPending");
      case "manual":
        return t("statusManual");
      default:
        return t("statusFree");
    }
  })();

  return (
    <div className="flex flex-col gap-4">
      {checkout === "success" ? (
        <p className="settings-alerts__item settings-alerts__item--success m-0" role="status">
          {t("checkoutSuccess")}
        </p>
      ) : checkout === "cancelled" ? (
        <p className="settings-alerts__item settings-alerts__item--info m-0" role="status">
          {t("checkoutCancelled")}
        </p>
      ) : null}

      <div className="flex flex-col gap-1">
        <span className="text-sm text-[var(--admin-text-muted)]">{t("currentPlan")}</span>
        <strong className="text-lg">{planLabel}</strong>
        <span
          className={`text-sm ${situation.kind === "payment_failed" ? "text-[var(--admin-danger,#b91c1c)]" : "text-[var(--admin-text-muted)]"}`}
        >
          {status}
        </span>
      </div>

      {!cardAvailable ? (
        <p className="m-0 text-sm text-[var(--admin-text-muted)]">{t("notConfigured")}</p>
      ) : (
        <>
          {offers.length > 0 ? (
            <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2">
              {offers.map((offer) => (
                <li
                  key={offer.id}
                  className="flex flex-col gap-2 rounded-xl border border-[var(--admin-border)] p-4"
                >
                  <strong>{offer.label}</strong>
                  <span className="text-sm text-[var(--admin-text-muted)]">
                    {t("price", { price: offer.priceEur })}
                  </span>
                  <span className="text-sm">{t(`offer.${offer.id}`)}</span>
                  <AdminButton
                    type="button"
                    size="sm"
                    variant="primary"
                    className="self-start"
                    disabled={pending}
                    onClick={() => go(() => startSubscriptionCheckoutAction(offer.id))}
                  >
                    {t("subscribe", { plan: offer.label })}
                  </AdminButton>
                </li>
              ))}
            </ul>
          ) : null}

          {hasCustomer ? (
            <div className="flex flex-col gap-1">
              <AdminButton
                type="button"
                size="sm"
                variant="secondary"
                className="self-start"
                disabled={pending}
                onClick={() => go(() => openBillingPortalAction())}
              >
                {t("manage")}
              </AdminButton>
              <span className="text-xs text-[var(--admin-text-muted)]">{t("manageHint")}</span>
            </div>
          ) : null}

          <p className="m-0 text-xs text-[var(--admin-text-muted)]">{t("vatNote")}</p>
        </>
      )}

      {situation.kind === "manual" || offers.length === 0 ? (
        <p className="m-0 text-xs text-[var(--admin-text-muted)]">
          {t("businessNote")}{" "}
          <a className="underline" href="mailto:contact@zalmox.app">
            contact@zalmox.app
          </a>
        </p>
      ) : null}

      {error ? (
        <p className="m-0 text-sm text-[var(--admin-danger,#b91c1c)]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
