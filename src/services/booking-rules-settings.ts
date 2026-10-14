import { cache } from "react";
import { unstable_cache } from "next/cache";
import { CACHE_TAGS, tenantTag } from "@/lib/cache-tags";
import { createPublicAdminClient } from "@/lib/supabase/admin";
import { resolveTenantIdForData } from "@/lib/tenant/resolve-id";
import {
  DEFAULT_BOOKING_RULES,
  parseBookingRulesRow,
  toStayPricingRules,
  type BookingRulesSettings,
  type StayPricingRules,
} from "@/domain/settings/booking-rules";
import type { ChildPolicy } from "@/domain/availability/party";

const BOOKING_RULES_SELECT = [
  "cancellation_policy_type",
  "cancellation_policy_days",
  "cancellation_policy_custom_text",
  "pricing_weekend_enabled",
  "pricing_weekend_mode",
  "pricing_weekend_multiplier",
  "pricing_seasons",
  "invoice_series",
  "invoice_next_number",
  "proforma_series",
  "proforma_next_number",
  "invoice_seller_reg_com",
  "invoice_vat_enabled",
  "invoice_vat_rate",
  "invoice_prices_include_vat",
  "child_max_age",
  "infant_max_age",
  "children_share_bed",
  "child_with_parents",
  "lone_teen_with_parents",
  "infants_with_parents",
  "extra_bed_fee",
  "cot_fee",
].join(", ");

async function loadBookingRulesUncached(
  tenantId: string
): Promise<BookingRulesSettings> {
  const supabase = createPublicAdminClient();
  const { data, error } = await supabase
    .from("pension_settings")
    .select(BOOKING_RULES_SELECT)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return parseBookingRulesRow(
    data as Record<string, unknown> | null | undefined
  );
}

const getCachedBookingRules = (tenantId: string) =>
  unstable_cache(
    () => loadBookingRulesUncached(tenantId),
    ["booking-rules", tenantId],
    {
      tags: [
        CACHE_TAGS.pensionSettings,
        tenantTag(tenantId, CACHE_TAGS.pensionSettings),
        `tenant-${tenantId}-settings`,
      ],
      revalidate: 300,
    }
  );

const loadBookingRules = cache((tenantId: string) =>
  getCachedBookingRules(tenantId)()
);

export async function getBookingRulesSettings(): Promise<BookingRulesSettings> {
  const tenantId = await resolveTenantIdForData();
  return loadBookingRules(tenantId);
}

export async function getStayPricingRules(): Promise<StayPricingRules> {
  const settings = await getBookingRulesSettings();
  return toStayPricingRules(settings);
}

export async function getChildPolicy(): Promise<ChildPolicy> {
  const settings = await getBookingRulesSettings();
  return settings.childPolicy;
}

export async function updateBookingRulesSettings(
  input: Partial<BookingRulesSettings>
): Promise<void> {
  const tenantId = await resolveTenantIdForData();
  const supabase = createPublicAdminClient();

  const update: Record<string, unknown> = {};
  if (input.cancellationPolicyType !== undefined) {
    update.cancellation_policy_type = input.cancellationPolicyType;
  }
  if (input.cancellationPolicyDays !== undefined) {
    update.cancellation_policy_days = input.cancellationPolicyDays;
  }
  if (input.cancellationPolicyCustomText !== undefined) {
    update.cancellation_policy_custom_text = input.cancellationPolicyCustomText;
  }
  if (input.pricingWeekendEnabled !== undefined) {
    update.pricing_weekend_enabled = input.pricingWeekendEnabled;
  }
  if (input.pricingWeekendMode !== undefined) {
    update.pricing_weekend_mode = input.pricingWeekendMode;
  }
  if (input.pricingWeekendMultiplier !== undefined) {
    update.pricing_weekend_multiplier = input.pricingWeekendMultiplier;
  }
  if (input.pricingSeasons !== undefined) {
    update.pricing_seasons = input.pricingSeasons;
  }
  if (input.invoiceSeries !== undefined) {
    update.invoice_series = input.invoiceSeries.trim().slice(0, 12);
  }
  if (input.invoiceSellerRegCom !== undefined) {
    update.invoice_seller_reg_com = input.invoiceSellerRegCom;
  }
  if (input.invoiceVatEnabled !== undefined) {
    update.invoice_vat_enabled = input.invoiceVatEnabled;
  }
  if (input.invoiceVatRate !== undefined) {
    update.invoice_vat_rate = input.invoiceVatRate;
  }
  if (input.invoicePricesIncludeVat !== undefined) {
    update.invoice_prices_include_vat = input.invoicePricesIncludeVat;
  }
  if (input.childPolicy !== undefined) {
    update.child_max_age = input.childPolicy.childMaxAge;
    update.infant_max_age = input.childPolicy.infantMaxAge;
    update.children_share_bed = input.childPolicy.childrenShareBed;
    update.child_with_parents = input.childPolicy.childWithParents;
    update.lone_teen_with_parents = input.childPolicy.loneTeenWithParents;
    update.infants_with_parents = input.childPolicy.infantsWithParents;
  }
  if (input.extraBedFeePerNight !== undefined) {
    update.extra_bed_fee = input.extraBedFeePerNight;
  }
  if (input.cotFeePerNight !== undefined) {
    update.cot_fee = input.cotFeePerNight;
  }

  if (Object.keys(update).length === 0) return;

  const { error } = await supabase
    .from("pension_settings")
    .update(update)
    .eq("tenant_id", tenantId);

  if (error) throw new Error(error.message);
}

export type { BookingRulesSettings, StayPricingRules };
