"use server";

import { requireStaffPermission } from "@/lib/auth/require-staff";
import { bustPensionSettingsCache } from "@/lib/cache/revalidate-settings";
import { resolveTenantIdForData } from "@/lib/tenant/resolve-id";
import { logAdminActivityFromSession } from "@/services/activity-log";
import { parseEmailSettingsPartial } from "@/domain/settings/schemas/email";
import { getTranslations } from "next-intl/server";

export async function updateEmailSettingsAction(
  formData: FormData
): Promise<{ ok: true } | { ok: false; error: string }> {
  const t = await getTranslations("admin.serverActions");
  try {
    await requireStaffPermission("pension_settings");
  } catch {
    return { ok: false, error: t("roleForbidden") };
  }

  const { updateEmailSettings } = await import("@/services/email-settings");

  const partial: Record<string, unknown> = {};
  const boolKeys = [
    "email_enabled",
    "email_notify_new_request",
    "email_notify_confirmation",
    "email_notify_cancellation",
    "email_notify_daily_summary",
  ];
  for (const key of boolKeys) {
    if (formData.has(key)) {
      partial[key] = String(formData.get(key)) === "true";
    }
  }
  if (formData.has("email_reply_to")) {
    partial.email_reply_to = String(formData.get("email_reply_to") ?? "").trim();
  }
  if (formData.has("email_from_name")) {
    partial.email_from_name = String(formData.get("email_from_name") ?? "").trim();
  }
  if (formData.has("email_from_address")) {
    partial.email_from_address = String(formData.get("email_from_address") ?? "").trim();
  }
  if (formData.has("email_custom_footer")) {
    partial.email_custom_footer = String(formData.get("email_custom_footer") ?? "").trim();
  }

  const parsed = parseEmailSettingsPartial(partial);
  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
  }

  try {
    await updateEmailSettings(parsed.data);
    await logAdminActivityFromSession({
      action: "settings.email_updated",
      entityType: "settings",
      summary: "Email notification settings updated",
    });
    bustPensionSettingsCache(await resolveTenantIdForData());
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : t("genericError"),
    };
  }
}

export async function sendTestEmailAction(): Promise<
  { ok: true; to: string } | { ok: false; error: string }
> {
  const t = await getTranslations("admin.serverActions");
  let user: { email?: string | null };
  try {
    ({ user } = await requireStaffPermission("pension_settings"));
  } catch {
    return { ok: false, error: t("roleForbidden") };
  }

  const email = user.email;
  if (!email) {
    return { ok: false, error: t("emailAccountMissing") };
  }

  const { isEmailDeliveryConfigured } = await import("@/lib/email/provider");
  if (!isEmailDeliveryConfigured()) {
    return { ok: false, error: t("emailProviderNotConfigured") };
  }
  const { sendTenantEmail } = await import("@/services/email-send");
  const { getTenantById } = await import("@/services/tenants");
  const { resolveTransactionalEmailIdentity } = await import(
    "@/services/email-identity"
  );
  const { testEmailTemplate } = await import("@/lib/email/templates");
  const { getEmailSettings } = await import("@/services/email-settings");

  const tenantId = await resolveTenantIdForData();
  const [identity, emailSettings, tenant] = await Promise.all([
    resolveTransactionalEmailIdentity(),
    getEmailSettings(),
    getTenantById(tenantId),
  ]);

  const template = testEmailTemplate({
    pensionName: identity.displayName,
    customFooter: emailSettings.email_custom_footer,
  });

  if (!tenant) {
    return { ok: false, error: t("emailSendFailed") };
  }

  const result = await sendTenantEmail(tenantId, tenant.slug, {
    from: identity.fromAddress,
    to: email,
    subject: template.subject,
    html: template.html,
    text: template.text,
    replyTo: identity.defaultReplyTo ?? undefined,
  });

  if (result.messageId === "skipped-monthly_cap_exceeded") {
    return { ok: false, error: t("emailMonthlyCapExceeded") };
  }

  if (!result.success) {
    return { ok: false, error: result.error ?? "Send failed" };
  }

  await logAdminActivityFromSession({
    action: "email.test_sent",
    entityType: "settings",
    summary: `Test email sent to ${email}`,
  });

  return { ok: true, to: email };
}
