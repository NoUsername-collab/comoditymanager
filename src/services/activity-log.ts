import type {
  ActivityAction,
  ActivityEntityType,
  ActivityLogEntry,
} from "@/domain/activity/types";
import { getAdminUser } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";

type LogInput = {
  action: ActivityAction;
  entityType: ActivityEntityType;
  entityId?: string | null;
  summary: string;
  metadata?: Record<string, unknown>;
  actor?: { id: string; email?: string | null } | null;
};

function mapRow(row: {
  id: string;
  created_at: string;
  actor_id: string | null;
  actor_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  summary: string;
  metadata: Record<string, unknown> | null;
}): ActivityLogEntry {
  return {
    id: row.id,
    created_at: row.created_at,
    actor_id: row.actor_id,
    actor_email: row.actor_email,
    action: row.action as ActivityAction,
    entity_type: row.entity_type as ActivityEntityType,
    entity_id: row.entity_id,
    summary: row.summary,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
  };
}

/** Înregistrează o acțiune; nu aruncă — jurnalul nu trebuie să blocheze fluxul principal. */
export async function logAdminActivity(input: LogInput): Promise<void> {
  try {
    const supabase = await createAdminClient();
    const { error } = await supabase.from("admin_activity_log").insert({
      actor_id: input.actor?.id ?? null,
      actor_email: input.actor?.email ?? null,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
      summary: input.summary.slice(0, 500),
      metadata: input.metadata ?? {},
    });
    if (error) console.error("[activity-log]", error.message);
  } catch (e) {
    console.error("[activity-log]", e);
  }
}

export async function logAdminActivityFromSession(
  input: Omit<LogInput, "actor">
): Promise<void> {
  const user = await getAdminUser();
  await logAdminActivity({
    ...input,
    actor: user ? { id: user.id, email: user.email } : null,
  });
}

export async function listRecentActivity(
  limit = 100
): Promise<ActivityLogEntry[]> {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("admin_activity_log")
    .select(
      "id, created_at, actor_id, actor_email, action, entity_type, entity_id, summary, metadata"
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapRow);
}

export async function listBookingActivity(
  bookingId: string,
  limit = 40
): Promise<ActivityLogEntry[]> {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("admin_activity_log")
    .select(
      "id, created_at, actor_id, actor_email, action, entity_type, entity_id, summary, metadata"
    )
    .eq("entity_type", "booking")
    .eq("entity_id", bookingId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapRow);
}
