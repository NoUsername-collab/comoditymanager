import { cache } from "react";
import { unstable_cache, revalidateTag } from "next/cache";
import { createPublicAdminClient } from "@/lib/supabase/admin";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { resolveTenantIdForData } from "@/lib/tenant/resolve-id";
import { getTenantScope } from "@/lib/tenant/scope";

export type EmailSettings = {
  email_enabled: boolean;
  email_notify_new_request: boolean;
  email_notify_confirmation: boolean;
  email_notify_cancellation: boolean;
  email_notify_daily_summary: boolean;
  email_reply_to: string | null;
  email_custom_footer: string | null;
};

export const DEFAULT_EMAIL_SETTINGS: EmailSettings = {
  email_enabled: true,
  email_notify_new_request: true,
  email_notify_confirmation: true,
  email_notify_cancellation: true,
  email_notify_daily_summary: false,
  email_reply_to: null,
  email_custom_footer: null,
};

const EMAIL_COLUMNS =
  "email_enabled, email_notify_new_request, email_notify_confirmation, email_notify_cancellation, email_notify_daily_summary, email_reply_to, email_custom_footer";

function mapRow(row: Record<string, unknown>): EmailSettings {
  return {
    email_enabled: row.email_enabled !== false,
    email_notify_new_request: row.email_notify_new_request !== false,
    email_notify_confirmation: row.email_notify_confirmation !== false,
    email_notify_cancellation: row.email_notify_cancellation !== false,
    email_notify_daily_summary: row.email_notify_daily_summary === true,
    email_reply_to: typeof row.email_reply_to === "string" ? row.email_reply_to : null,
    email_custom_footer: typeof row.email_custom_footer === "string" ? row.email_custom_footer : null,
  };
}

async function getEmailSettingsUncached(tenantId: string): Promise<EmailSettings> {
  const supabase = createPublicAdminClient();
  const result = await supabase
    .from("pension_settings")
    .select(EMAIL_COLUMNS)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (result.error) {
    if (result.error.message.includes("email_enabled")) {
      return DEFAULT_EMAIL_SETTINGS;
    }
    throw new Error(result.error.message);
  }

  if (!result.data) return DEFAULT_EMAIL_SETTINGS;
  return mapRow(result.data);
}

const getCachedEmailSettings = (tenantId: string) =>
  unstable_cache(
    () => getEmailSettingsUncached(tenantId),
    ["email-settings", tenantId],
    {
      tags: [CACHE_TAGS.pensionSettings, `tenant-${tenantId}-settings`],
      revalidate: 300,
    },
  );

const loadEmailSettings = cache((tenantId: string) =>
  getCachedEmailSettings(tenantId)(),
);

export async function getEmailSettings(): Promise<EmailSettings> {
  const tenantId = await resolveTenantIdForData();
  return loadEmailSettings(tenantId);
}

export async function updateEmailSettings(
  input: Partial<EmailSettings>,
): Promise<void> {
  const { tenantId, supabase } = await getTenantScope();

  const update: Record<string, unknown> = {};
  if (input.email_enabled !== undefined) update.email_enabled = input.email_enabled;
  if (input.email_notify_new_request !== undefined) update.email_notify_new_request = input.email_notify_new_request;
  if (input.email_notify_confirmation !== undefined) update.email_notify_confirmation = input.email_notify_confirmation;
  if (input.email_notify_cancellation !== undefined) update.email_notify_cancellation = input.email_notify_cancellation;
  if (input.email_notify_daily_summary !== undefined) update.email_notify_daily_summary = input.email_notify_daily_summary;
  if (input.email_reply_to !== undefined) update.email_reply_to = input.email_reply_to || null;
  if (input.email_custom_footer !== undefined) update.email_custom_footer = input.email_custom_footer || null;

  const { error } = await supabase
    .from("pension_settings")
    .update(update)
    .eq("tenant_id", tenantId);

  if (error) throw new Error(error.message);

  revalidateTag(CACHE_TAGS.pensionSettings, "max");
  revalidateTag(`tenant-${tenantId}-settings`, "max");
}
