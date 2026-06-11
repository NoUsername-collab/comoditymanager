import { cache } from "react";
import type {
  ActivityAction,
  ActivityEntityType,
  ActivityLogEntry,
} from "@/domain/activity/types";
import { getAdminUser } from "@/lib/auth/require-admin";
import { getTenantScope, withTenantId } from "@/lib/tenant/scope";

export type LogInput = {
  action: ActivityAction;
  entityType: ActivityEntityType;
  entityId?: string | null;
  summary: string;
  metadata?: Record<string, unknown>;
  actor?: { id: string; email?: string | null } | null;
  undoable?: boolean;
  revertsLogId?: string | null;
};

type ActivityRow = {
  id: string;
  created_at: string;
  actor_id: string | null;
  actor_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  summary: string;
  metadata: Record<string, unknown> | null;
  undoable: boolean;
  undone_at: string | null;
  undone_by: string | null;
  reverts_log_id: string | null;
};

const ACTIVITY_SELECT = `
  id, created_at, actor_id, actor_email, action, entity_type, entity_id,
  summary, metadata, undoable, undone_at, undone_by, reverts_log_id
`;

function mapRow(row: ActivityRow): ActivityLogEntry {
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
    undoable: Boolean(row.undoable),
    undone_at: row.undone_at,
    undone_by: row.undone_by,
    reverts_log_id: row.reverts_log_id,
  };
}

/** Înregistrează o acțiune; returnează id-ul rândului sau null la eșec. */
export async function logAdminActivity(input: LogInput): Promise<string | null> {
  try {
    const { tenantId, supabase } = await getTenantScope();
    const { data, error } = await supabase
      .from("admin_activity_log")
      .insert(
        withTenantId(tenantId, {
          actor_id: input.actor?.id ?? null,
          actor_email: input.actor?.email ?? null,
          action: input.action,
          entity_type: input.entityType,
          entity_id: input.entityId ?? null,
          summary: input.summary.slice(0, 500),
          metadata: input.metadata ?? {},
          undoable: input.undoable ?? false,
          reverts_log_id: input.revertsLogId ?? null,
        })
      )
      .select("id")
      .single();

    if (error) {
      console.error("[activity-log]", error.message);
      return null;
    }
    return data?.id ?? null;
  } catch (e) {
    console.error("[activity-log]", e);
    return null;
  }
}

export async function logAdminActivityFromSession(
  input: Omit<LogInput, "actor">
): Promise<string | null> {
  const user = await getAdminUser();
  return logAdminActivity({
    ...input,
    actor: user ? { id: user.id, email: user.email } : null,
  });
}

const loadActivityLogEntryById = cache(async (
  id: string
): Promise<ActivityLogEntry | null> => {
  const { tenantId, supabase } = await getTenantScope();
  const { data, error } = await supabase
    .from("admin_activity_log")
    .select(ACTIVITY_SELECT)
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? mapRow(data as ActivityRow) : null;
});

export async function getActivityLogEntryById(
  id: string
): Promise<ActivityLogEntry | null> {
  return loadActivityLogEntryById(id);
}

const loadRecentActivity = cache(async (
  limit: number
): Promise<ActivityLogEntry[]> => {
  const { tenantId, supabase } = await getTenantScope();
  const { data, error } = await supabase
    .from("admin_activity_log")
    .select(ACTIVITY_SELECT)
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapRow(row as ActivityRow));
});

export async function listRecentActivity(
  limit = 100
): Promise<ActivityLogEntry[]> {
  return loadRecentActivity(limit);
}

const BOOKING_LINKED_CHECKIN_ACTIONS = [
  "checkin.created",
  "checkin.updated",
] as const satisfies readonly ActivityAction[];

function mergeActivityByRecency(
  batches: ActivityLogEntry[][],
  limit: number
): ActivityLogEntry[] {
  const byId = new Map<string, ActivityLogEntry>();
  for (const batch of batches) {
    for (const entry of batch) {
      byId.set(entry.id, entry);
    }
  }
  return [...byId.values()]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .slice(0, limit);
}

const loadBookingActivity = cache(async (
  bookingId: string,
  limit: number
): Promise<ActivityLogEntry[]> => {
  const { tenantId, supabase } = await getTenantScope();

  const [bookingResult, checkinResult] = await Promise.all([
    supabase
      .from("admin_activity_log")
      .select(ACTIVITY_SELECT)
      .eq("tenant_id", tenantId)
      .eq("entity_type", "booking")
      .eq("entity_id", bookingId)
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("admin_activity_log")
      .select(ACTIVITY_SELECT)
      .eq("tenant_id", tenantId)
      .in("action", [...BOOKING_LINKED_CHECKIN_ACTIONS])
      .filter("metadata->>booking_id", "eq", bookingId)
      .order("created_at", { ascending: false })
      .limit(limit),
  ]);

  if (bookingResult.error) throw new Error(bookingResult.error.message);
  if (checkinResult.error) throw new Error(checkinResult.error.message);

  return mergeActivityByRecency(
    [
      (bookingResult.data ?? []).map((row) => mapRow(row as ActivityRow)),
      (checkinResult.data ?? []).map((row) => mapRow(row as ActivityRow)),
    ],
    limit
  );
});

export async function listBookingActivity(
  bookingId: string,
  limit = 40
): Promise<ActivityLogEntry[]> {
  return loadBookingActivity(bookingId, limit);
}
