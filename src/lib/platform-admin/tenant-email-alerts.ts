import {
  DEFAULT_TENANT_EMAIL_DELIVERY,
  effectiveMonthlySendCap,
  type TenantEmailDeliveryRecord,
} from "@/domain/email/delivery-policy";
import {
  emailUsageAlertLevel,
  type EmailUsageAlertLevel,
} from "@/domain/email/usage-alert";
import { getPlanConfig, resolvePlanId } from "@/core/config/plans";
import { loadAllTenantEmailUsageForMonth } from "@/services/tenant-email-usage";
import { createPublicAdminClient } from "@/lib/supabase/admin";

export type TenantEmailListAlert = {
  sentCount: number;
  cap: number | null;
  alert: EmailUsageAlertLevel;
};

type DeliveryRow = {
  tenant_id: string;
  monthly_send_cap: number | null;
};

export async function loadTenantEmailListAlerts(
  tenants: Array<{ id: string; plan_id: string }>,
): Promise<Map<string, TenantEmailListAlert>> {
  const [usageMap, deliveryMap] = await Promise.all([
    loadAllTenantEmailUsageForMonth(),
    loadAllTenantDeliveryCaps(),
  ]);

  const out = new Map<string, TenantEmailListAlert>();
  for (const tenant of tenants) {
    const sentCount = usageMap.get(tenant.id) ?? 0;
    const delivery = deliveryMap.get(tenant.id) ?? DEFAULT_TENANT_EMAIL_DELIVERY;
    const plan = getPlanConfig(resolvePlanId(tenant.plan_id));
    const cap = effectiveMonthlySendCap(plan, delivery);
    out.set(tenant.id, {
      sentCount,
      cap,
      alert: emailUsageAlertLevel(sentCount, cap),
    });
  }
  return out;
}

async function loadAllTenantDeliveryCaps(): Promise<
  Map<string, TenantEmailDeliveryRecord>
> {
  const supabase = createPublicAdminClient();
  const { data, error } = await supabase
    .from("tenant_email_delivery")
    .select("tenant_id, monthly_send_cap");

  if (error) {
    if (error.message.includes("tenant_email_delivery")) return new Map();
    throw new Error(error.message);
  }

  const map = new Map<string, TenantEmailDeliveryRecord>();
  for (const row of (data ?? []) as DeliveryRow[]) {
    map.set(row.tenant_id, {
      ...DEFAULT_TENANT_EMAIL_DELIVERY,
      monthlySendCap: row.monthly_send_cap,
    });
  }
  return map;
}
