import { createAdminClient } from "@/lib/supabase/admin";
import { requireTenantIdForData } from "@/lib/tenant/guards";
import type { GuestReceptionRequestSnapshot } from "@/domain/guest-app/reception-request";

type Row = {
  id: string;
  booking_id: string;
  message: string;
  status: string;
  created_at: string;
};

function toSnapshot(row: Row): GuestReceptionRequestSnapshot {
  return {
    id: row.id,
    message: row.message,
    status: row.status === "seen" ? "seen" : "pending",
    createdAt: row.created_at,
  };
}

export async function listGuestReceptionRequests(
  bookingId: string,
): Promise<GuestReceptionRequestSnapshot[]> {
  const tenantId = await requireTenantIdForData();
  const supabase = await createAdminClient();
  const { data } = await supabase
    .from("guest_reception_requests")
    .select("id, booking_id, message, status, created_at")
    .eq("tenant_id", tenantId)
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: false });
  return (data ?? []).map((row) => toSnapshot(row as Row));
}

export async function markGuestReceptionRequestSeen(
  bookingId: string,
  requestId: string,
): Promise<void> {
  const tenantId = await requireTenantIdForData();
  const supabase = await createAdminClient();
  await supabase
    .from("guest_reception_requests")
    .update({ status: "seen" })
    .eq("tenant_id", tenantId)
    .eq("booking_id", bookingId)
    .eq("id", requestId)
    .eq("status", "pending");
}
