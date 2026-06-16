import { cache } from "react";
import { unstable_cache } from "next/cache";
import { CACHE_TAGS, tenantTag } from "@/lib/cache-tags";
import { getTenantScope } from "@/lib/tenant/scope";
import { resolveTenantIdForData } from "@/lib/tenant/resolve-id";
import { createPublicAdminClient } from "@/lib/supabase/admin";
import type { CheckinSettings } from "@/domain/checkin/types";
import { isCheckinMigrationMissing } from "@/lib/checkin/migration";

import { getTenantById } from "@/services/tenants";

const CHECKIN_SETTINGS_BASE_COLUMNS = [
  "display_name",
  "checkin_doc_rule",
  "checkin_phone_rule",
  "checkin_cnp_rule",
  "checkin_payment_rule",
  "checkin_min_payment_pct",
  "checkin_deposit",
  "checkin_deposit_amount",
  "walkin_allowed",
  "group_checkin_mode",
  "checkin_time_from",
  "checkout_time_until",
  "late_checkout_allowed",
  "late_checkout_fee",
  "early_checkin_allowed",
  "early_checkin_fee",
  "fisa_property_address",
  "fisa_owner_cui",
  "fisa_tourism_license",
] as const;

const CHECKIN_SETTINGS_EXTENDED_COLUMNS = [
  "checkin_key_rule",
  "checkin_ids_per_room",
  "checkin_ids_per_room_custom",
] as const;

const CHECKIN_SETTINGS_SELECT = [
  ...CHECKIN_SETTINGS_BASE_COLUMNS,
  "checkout_block_unpaid",
  ...CHECKIN_SETTINGS_EXTENDED_COLUMNS,
].join(", ");

const CHECKIN_SETTINGS_SELECT_WITHOUT_EXTENDED = [
  ...CHECKIN_SETTINGS_BASE_COLUMNS,
  "checkout_block_unpaid",
].join(", ");

const CHECKIN_SETTINGS_SELECT_WITHOUT_CHECKOUT_BLOCK =
  CHECKIN_SETTINGS_BASE_COLUMNS.join(", ");

const CHECKIN_SETTINGS_FISA_READ = [
  "display_name",
  "checkin_cnp_rule",
  "fisa_property_address",
  "fisa_owner_cui",
  "fisa_tourism_license",
].join(", ");

const CHECKIN_SETTINGS_SELECT_VARIANTS = [
  CHECKIN_SETTINGS_SELECT,
  CHECKIN_SETTINGS_SELECT_WITHOUT_EXTENDED,
  CHECKIN_SETTINGS_SELECT_WITHOUT_CHECKOUT_BLOCK,
  CHECKIN_SETTINGS_FISA_READ,
] as const;

function checkinSettingsCacheTag(tenantId: string): string {
  return `checkin-settings-${tenantId}`;
}

/** Default settings used when DB row is missing or columns not yet migrated */
export const DEFAULT_CHECKIN_SETTINGS: CheckinSettings = {
  pension_display_name: "Pensiune",
  checkin_doc_rule: "recommended",
  checkin_phone_rule: "recommended",
  checkin_cnp_rule: "required",
  checkin_payment_rule: "at_checkout",
  checkin_min_payment_pct: 30,
  checkin_deposit: false,
  checkin_deposit_amount: 0,
  walkin_allowed: true,
  group_checkin_mode: "per_room",
  checkin_time_from: "14:00",
  checkout_time_until: "12:00",
  late_checkout_allowed: true,
  late_checkout_fee: 0,
  checkout_block_unpaid: true,
  early_checkin_allowed: true,
  early_checkin_fee: 0,
  checkin_key_rule: "always",
  checkin_ids_per_room: "one",
  checkin_ids_per_room_custom: null,
  fisa_property_address: null,
  fisa_owner_cui: null,
  fisa_tourism_license: null,
};

function parseTimeField(raw: unknown): string | null {
  if (raw == null) return null;
  const s = String(raw);
  // DB returns "14:00:00", we want "14:00"
  return s.length >= 5 ? s.slice(0, 5) : s;
}

function mapRow(row: Record<string, unknown>): CheckinSettings {
  return {
    pension_display_name:
      String(row.display_name ?? "").trim() ||
      DEFAULT_CHECKIN_SETTINGS.pension_display_name,
    checkin_doc_rule:
      (row.checkin_doc_rule as CheckinSettings["checkin_doc_rule"]) ??
      DEFAULT_CHECKIN_SETTINGS.checkin_doc_rule,
    checkin_phone_rule:
      (row.checkin_phone_rule as CheckinSettings["checkin_phone_rule"]) ??
      DEFAULT_CHECKIN_SETTINGS.checkin_phone_rule,
    checkin_cnp_rule:
      (row.checkin_cnp_rule as CheckinSettings["checkin_cnp_rule"]) ??
      DEFAULT_CHECKIN_SETTINGS.checkin_cnp_rule,
    checkin_payment_rule:
      (row.checkin_payment_rule as CheckinSettings["checkin_payment_rule"]) ??
      DEFAULT_CHECKIN_SETTINGS.checkin_payment_rule,
    checkin_min_payment_pct:
      Number(row.checkin_min_payment_pct) ||
      DEFAULT_CHECKIN_SETTINGS.checkin_min_payment_pct,
    checkin_deposit: Boolean(row.checkin_deposit),
    checkin_deposit_amount: Number(row.checkin_deposit_amount) || 0,
    walkin_allowed:
      row.walkin_allowed != null
        ? Boolean(row.walkin_allowed)
        : DEFAULT_CHECKIN_SETTINGS.walkin_allowed,
    group_checkin_mode:
      (row.group_checkin_mode as CheckinSettings["group_checkin_mode"]) ??
      DEFAULT_CHECKIN_SETTINGS.group_checkin_mode,
    checkin_time_from: parseTimeField(row.checkin_time_from),
    checkout_time_until: parseTimeField(row.checkout_time_until),
    late_checkout_allowed:
      row.late_checkout_allowed != null
        ? Boolean(row.late_checkout_allowed)
        : DEFAULT_CHECKIN_SETTINGS.late_checkout_allowed,
    late_checkout_fee: Number(row.late_checkout_fee) || 0,
    checkout_block_unpaid:
      row.checkout_block_unpaid != null
        ? Boolean(row.checkout_block_unpaid)
        : DEFAULT_CHECKIN_SETTINGS.checkout_block_unpaid,
    early_checkin_allowed:
      row.early_checkin_allowed != null
        ? Boolean(row.early_checkin_allowed)
        : DEFAULT_CHECKIN_SETTINGS.early_checkin_allowed,
    early_checkin_fee: Number(row.early_checkin_fee) || 0,
    checkin_key_rule:
      (row.checkin_key_rule as CheckinSettings["checkin_key_rule"]) ??
      DEFAULT_CHECKIN_SETTINGS.checkin_key_rule,
    checkin_ids_per_room:
      (row.checkin_ids_per_room as CheckinSettings["checkin_ids_per_room"]) ??
      DEFAULT_CHECKIN_SETTINGS.checkin_ids_per_room,
    checkin_ids_per_room_custom:
      row.checkin_ids_per_room_custom != null
        ? Number(row.checkin_ids_per_room_custom)
        : null,
    fisa_property_address:
      row.fisa_property_address != null
        ? String(row.fisa_property_address)
        : null,
    fisa_owner_cui:
      row.fisa_owner_cui != null ? String(row.fisa_owner_cui) : null,
    fisa_tourism_license:
      row.fisa_tourism_license != null
        ? String(row.fisa_tourism_license)
        : null,
  };
}

// ── Read ────────────────────────────────────────────────────

async function loadCheckinSettingsRow(
  tenantId: string,
): Promise<Record<string, unknown> | null> {
  const supabase = createPublicAdminClient();

  for (const select of CHECKIN_SETTINGS_SELECT_VARIANTS) {
    const { data, error } = await supabase
      .from("pension_settings")
      .select(select)
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (!error) {
      return (data as Record<string, unknown> | null) ?? null;
    }
    if (!isCheckinMigrationMissing(error.message)) {
      throw new Error(error.message);
    }
  }

  return null;
}

async function getCheckinSettingsUncached(
  tenantId: string,
): Promise<CheckinSettings> {
  try {
    const data = await loadCheckinSettingsRow(tenantId);
    if (!data) return { ...DEFAULT_CHECKIN_SETTINGS };
    return mapRow(data);
  } catch (error) {
    if (
      error instanceof Error &&
      isCheckinMigrationMissing(error.message)
    ) {
      return { ...DEFAULT_CHECKIN_SETTINGS };
    }
    throw error;
  }
}

const getCachedCheckinSettings = (tenantId: string) =>
  unstable_cache(
    () => getCheckinSettingsUncached(tenantId),
    ["checkin-settings", tenantId],
    {
      tags: [
        CACHE_TAGS.pensionSettings,
        tenantTag(tenantId, CACHE_TAGS.pensionSettings),
        checkinSettingsCacheTag(tenantId),
      ],
      revalidate: 300,
    }
  );

const loadCheckinSettings = cache((tenantId: string) =>
  getCachedCheckinSettings(tenantId)()
);

/** Per-request dedupe + 5min cross-request cache (busted via pensionSettings tag). */
export async function getCheckinSettings(): Promise<CheckinSettings> {
  const tenantId = await resolveTenantIdForData();
  return loadCheckinSettings(tenantId);
}

// ── Update ──────────────────────────────────────────────────

export async function updateCheckinSettings(
  input: Partial<CheckinSettings>,
): Promise<void> {
  const { tenantId, supabase } = await getTenantScope();

  // Build the update object — only include fields that were provided
  const update: Record<string, unknown> = {};
  if (input.checkin_doc_rule != null)
    update.checkin_doc_rule = input.checkin_doc_rule;
  if (input.checkin_phone_rule != null)
    update.checkin_phone_rule = input.checkin_phone_rule;
  if (input.checkin_cnp_rule != null)
    update.checkin_cnp_rule = input.checkin_cnp_rule;
  if (input.checkin_payment_rule != null)
    update.checkin_payment_rule = input.checkin_payment_rule;
  if (input.checkin_min_payment_pct != null)
    update.checkin_min_payment_pct = input.checkin_min_payment_pct;
  if (input.checkin_deposit != null)
    update.checkin_deposit = input.checkin_deposit;
  if (input.checkin_deposit_amount != null)
    update.checkin_deposit_amount = input.checkin_deposit_amount;
  if (input.walkin_allowed != null)
    update.walkin_allowed = input.walkin_allowed;
  if (input.group_checkin_mode != null)
    update.group_checkin_mode = input.group_checkin_mode;
  if (input.checkin_time_from !== undefined)
    update.checkin_time_from = input.checkin_time_from;
  if (input.checkout_time_until !== undefined)
    update.checkout_time_until = input.checkout_time_until;
  if (input.late_checkout_allowed != null)
    update.late_checkout_allowed = input.late_checkout_allowed;
  if (input.late_checkout_fee != null)
    update.late_checkout_fee = input.late_checkout_fee;
  if (input.checkout_block_unpaid != null)
    update.checkout_block_unpaid = input.checkout_block_unpaid;
  if (input.early_checkin_allowed != null)
    update.early_checkin_allowed = input.early_checkin_allowed;
  if (input.early_checkin_fee != null)
    update.early_checkin_fee = input.early_checkin_fee;
  if (input.checkin_key_rule != null)
    update.checkin_key_rule = input.checkin_key_rule;
  if (input.checkin_ids_per_room != null)
    update.checkin_ids_per_room = input.checkin_ids_per_room;
  if (input.checkin_ids_per_room_custom !== undefined)
    update.checkin_ids_per_room_custom = input.checkin_ids_per_room_custom;
  if (input.fisa_property_address !== undefined)
    update.fisa_property_address = input.fisa_property_address;
  if (input.fisa_owner_cui !== undefined)
    update.fisa_owner_cui = input.fisa_owner_cui;
  if (input.fisa_tourism_license !== undefined)
    update.fisa_tourism_license = input.fisa_tourism_license;

  if (Object.keys(update).length === 0) return;

  await ensurePensionSettingsRow(tenantId, supabase);

  const { data, error } = await supabase
    .from("pension_settings")
    .update(update)
    .eq("tenant_id", tenantId)
    .select("tenant_id")
    .maybeSingle();

  if (error) {
    if (isCheckinMigrationMissing(error.message)) {
      throw new Error("checkin.migration_required");
    }
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error("settings.pension_settings_missing");
  }
}

async function ensurePensionSettingsRow(
  tenantId: string,
  supabase: Awaited<ReturnType<typeof getTenantScope>>["supabase"]
): Promise<void> {
  const { data: existing, error: readError } = await supabase
    .from("pension_settings")
    .select("tenant_id")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (readError) {
    throw new Error(readError.message);
  }
  if (existing) return;

  const tenant = await getTenantById(tenantId);
  const { error: insertError } = await supabase.from("pension_settings").insert({
    tenant_id: tenantId,
    display_name: tenant?.display_name?.trim() || "Pensiune",
    admin_palette_key: "default",
  });

  if (insertError) {
    throw new Error(insertError.message);
  }
}

export { checkinSettingsCacheTag };
