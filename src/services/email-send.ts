import { sendEmail, type EmailMessage, type EmailResult } from "@/lib/email/provider";
import { resolveTenantEmailSendForTenant } from "@/services/tenant-email-delivery";
import {
  acquireTenantEmailSendSlot,
  releaseTenantEmailSendSlot,
} from "@/services/tenant-email-usage";

/**
 * Tenant-aware outbound email with delivery policy + monthly cap enforcement.
 * A notice to the property's own team (`countsTowardCap: false`) is not one of
 * the plan's messages: it neither needs nor uses up the monthly allowance.
 */
export async function sendTenantEmail(
  tenantId: string,
  tenantSlug: string,
  message: EmailMessage,
  options: { countsTowardCap?: boolean } = {},
): Promise<EmailResult> {
  const countsTowardCap = options.countsTowardCap ?? true;
  const resolution = await resolveTenantEmailSendForTenant(tenantId, tenantSlug);
  const blocked = countsTowardCap
    ? !resolution.canSend || resolution.monthlyCap === 0
    : !resolution.canSend && resolution.skipReason !== "monthly_cap_exceeded";

  if (blocked) {
    if (process.env.NODE_ENV === "development") {
      console.log(`[EMAIL-SKIP] tenant=${tenantSlug} reason=${resolution.skipReason ?? "unknown"}`);
    }
    return {
      success: true,
      messageId: `skipped-${resolution.skipReason ?? "policy"}`,
    };
  }

  if (!countsTowardCap) {
    return sendEmail(message, { apiKey: resolution.apiKey ?? undefined });
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
