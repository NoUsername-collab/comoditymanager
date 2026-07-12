import { sendEmail, type EmailMessage, type EmailResult } from "@/lib/email/provider";
import { resolveTenantEmailSendForTenant } from "@/services/tenant-email-delivery";
import {
  acquireTenantEmailSendSlot,
  releaseTenantEmailSendSlot,
} from "@/services/tenant-email-usage";

/** Tenant-aware outbound email with delivery policy + monthly cap enforcement. */
export async function sendTenantEmail(
  tenantId: string,
  tenantSlug: string,
  message: EmailMessage,
): Promise<EmailResult> {
  const resolution = await resolveTenantEmailSendForTenant(tenantId, tenantSlug);

  if (!resolution.canSend) {
    if (process.env.NODE_ENV === "development") {
      console.log(
        `[EMAIL-SKIP] tenant=${tenantSlug} reason=${resolution.skipReason ?? "unknown"}`,
      );
    }
    return {
      success: true,
      messageId: `skipped-${resolution.skipReason ?? "policy"}`,
    };
  }

  const slot = await acquireTenantEmailSendSlot(tenantId, resolution.monthlyCap);
  if (!slot.allowed) {
    if (process.env.NODE_ENV === "development") {
      console.log(
        `[EMAIL-SKIP] tenant=${tenantSlug} reason=monthly_cap_exceeded count=${slot.sentCount} cap=${slot.cap}`,
      );
    }
    return {
      success: true,
      messageId: "skipped-monthly_cap_exceeded",
    };
  }

  const result = await sendEmail(message, { apiKey: resolution.apiKey ?? undefined });

  if (!result.success) {
    await releaseTenantEmailSendSlot(tenantId).catch(() => undefined);
  }

  return result;
}
