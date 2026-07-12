import type { ActivityAction, ActivityEntityType } from "@/domain/activity/types";
import { createPublicAdminClient } from "@/lib/supabase/admin";

export type PlatformActivityActor = {
  userId: string;
  email: string;
};

export type PlatformActivityInput = {
  tenantId: string;
  actor: PlatformActivityActor;
  action: ActivityAction;
  entityType?: ActivityEntityType;
  entityId?: string | null;
  summary: string;
  metadata?: Record<string, unknown>;
};

/** Cross-tenant audit row — written by platform operators into tenant activity log. */
export async function logPlatformAdminActivity(
  input: PlatformActivityInput
): Promise<void> {
  try {
    const supabase = createPublicAdminClient();
    const { error } = await supabase.from("admin_activity_log").insert({
      tenant_id: input.tenantId,
      actor_id: input.actor.userId,
      actor_email: input.actor.email,
      action: input.action,
      entity_type: input.entityType ?? "tenant",
      entity_id: input.entityId ?? input.tenantId,
      summary: input.summary.slice(0, 500),
      metadata: {
        ...(input.metadata ?? {}),
        source: "platform-admin",
      },
      undoable: false,
      reverts_log_id: null,
    });

    if (error) {
      console.error("[platform-activity-log]", error.message);
    }
  } catch (error) {
    console.error("[platform-activity-log]", error);
  }
}
