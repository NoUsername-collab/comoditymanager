/**
 * Lightweight migration marker checks for platform admin dev tools.
 * Probes critical schema objects via PostgREST — no raw SQL required.
 */

import { cache } from "react";
import { createPublicAdminClient } from "@/lib/supabase/admin";

export type MigrationMarker = {
  id: string;
  label: string;
  ok: boolean;
  detail?: string;
};

type MarkerProbe = {
  id: string;
  label: string;
  table: string;
  column?: string;
};

const CRITICAL_MARKERS: MarkerProbe[] = [
  { id: "026", label: "multi_tenant", table: "tenants" },
  { id: "026", label: "tenant_domains", table: "tenant_domains" },
  { id: "047", label: "tenant_billing", table: "tenants", column: "is_paying" },
  { id: "048", label: "checkin_system", table: "checkins" },
  { id: "020", label: "dev_logs", table: "dev_logs" },
  { id: "007", label: "admin_activity_log", table: "admin_activity_log" },
  { id: "036", label: "platform_settings", table: "platform_settings" },
  { id: "051", label: "resource_counts_rpc", table: "tenants", column: "plan_id" },
  { id: "093", label: "tenant_email_delivery", table: "tenant_email_delivery", column: "delivery_mode" },
  { id: "094", label: "tenant_email_secrets", table: "tenant_email_secrets", column: "resend_key_hint" },
  { id: "095", label: "tenant_email_usage", table: "tenant_email_usage", column: "sent_count" },
];

export function isMissingSchemaError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("does not exist") ||
    lower.includes("could not find") ||
    lower.includes("schema cache")
  );
}

async function probeMarker(probe: MarkerProbe): Promise<MigrationMarker> {
  const supabase = createPublicAdminClient();
  const select = probe.column ?? "id";
  const { error } = await supabase.from(probe.table).select(select).limit(0);

  if (!error) {
    return { id: probe.id, label: probe.label, ok: true };
  }

  if (isMissingSchemaError(error.message)) {
    return {
      id: probe.id,
      label: probe.label,
      ok: false,
      detail: error.message,
    };
  }

  // Transient or permission errors — treat as present to avoid false alarms.
  return { id: probe.id, label: probe.label, ok: true };
}

/** Returns critical migration markers for the dev tools panel. */
export const auditCriticalMigrations = cache(async (): Promise<MigrationMarker[]> => {
  return Promise.all(CRITICAL_MARKERS.map(probeMarker));
});
