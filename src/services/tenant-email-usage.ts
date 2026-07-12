import {
  currentUtcMonthPeriod,
  monthlyCapExceeded,
} from "@/domain/email/usage-cap";
import { createPublicAdminClient } from "@/lib/supabase/admin";

export type EmailUsageAcquireResult = {
  allowed: boolean;
  sentCount: number;
  cap: number | null;
  periodMonth: string;
};

type AcquireRpcPayload = {
  allowed?: boolean;
  sent_count?: number;
  cap?: number | null;
  period_month?: string;
};

function mapAcquirePayload(payload: AcquireRpcPayload | null): EmailUsageAcquireResult {
  return {
    allowed: payload?.allowed === true,
    sentCount: typeof payload?.sent_count === "number" ? payload.sent_count : 0,
    cap: typeof payload?.cap === "number" ? payload.cap : null,
    periodMonth:
      typeof payload?.period_month === "string"
        ? payload.period_month
        : currentUtcMonthPeriod(),
  };
}

export async function getTenantEmailSentCountForMonth(
  tenantId: string,
  periodMonth: string = currentUtcMonthPeriod(),
): Promise<number> {
  const supabase = createPublicAdminClient();
  const { data, error } = await supabase
    .from("tenant_email_usage")
    .select("sent_count")
    .eq("tenant_id", tenantId)
    .eq("period_month", periodMonth)
    .maybeSingle();

  if (error) {
    if (error.message.includes("tenant_email_usage")) return 0;
    throw new Error(error.message);
  }

  return typeof data?.sent_count === "number" ? data.sent_count : 0;
}

export async function acquireTenantEmailSendSlot(
  tenantId: string,
  cap: number | null,
): Promise<EmailUsageAcquireResult> {
  const supabase = createPublicAdminClient();
  const { data, error } = await supabase.rpc("acquire_tenant_email_send_slot", {
    p_tenant_id: tenantId,
    p_cap: cap,
  });

  if (error) {
    if (
      error.message.includes("tenant_email_usage") ||
      error.message.includes("acquire_tenant_email_send_slot")
    ) {
      return {
        allowed: true,
        sentCount: 0,
        cap,
        periodMonth: currentUtcMonthPeriod(),
      };
    }
    throw new Error(error.message);
  }

  return mapAcquirePayload((data ?? null) as AcquireRpcPayload | null);
}

export async function releaseTenantEmailSendSlot(tenantId: string): Promise<void> {
  const supabase = createPublicAdminClient();
  const { error } = await supabase.rpc("release_tenant_email_send_slot", {
    p_tenant_id: tenantId,
  });

  if (error && !error.message.includes("release_tenant_email_send_slot")) {
    throw new Error(error.message);
  }
}

export function wouldExceedCap(sentCount: number, cap: number | null): boolean {
  return monthlyCapExceeded(sentCount, cap);
}

export type TenantEmailUsageSnapshot = {
  sentCount: number;
  cap: number | null;
};

export async function loadAllTenantEmailUsageForMonth(
  periodMonth: string = currentUtcMonthPeriod(),
): Promise<Map<string, number>> {
  const supabase = createPublicAdminClient();
  const { data, error } = await supabase
    .from("tenant_email_usage")
    .select("tenant_id, sent_count")
    .eq("period_month", periodMonth);

  if (error) {
    if (error.message.includes("tenant_email_usage")) return new Map();
    throw new Error(error.message);
  }

  const map = new Map<string, number>();
  for (const row of data ?? []) {
    if (typeof row.sent_count === "number") {
      map.set(row.tenant_id, row.sent_count);
    }
  }
  return map;
}
