import { cache } from "react";
import { parseGuestTags } from "@/domain/guest/tags";
import type { GuestListItem } from "@/domain/guest/types";
import { getTenantScope } from "@/lib/tenant/scope";
import { getGuestBaseById } from "./lookup";

const loadDuplicateGuestsForGuest = cache(async (
  guestId: string
): Promise<GuestListItem[]> => {
  const guest = await getGuestBaseById(guestId);
  if (!guest) return [];

  const { tenantId, supabase } = await getTenantScope();
  const orParts: string[] = [];
  if (guest.phone_normalized) {
    orParts.push(`phone_normalized.eq.${guest.phone_normalized}`);
  }
  if (guest.email_normalized) {
    orParts.push(`email_normalized.eq.${guest.email_normalized}`);
  }
  if (orParts.length === 0) return [];

  const { data, error } = await supabase
    .from("guests")
    .select("id, display_name, phone, email, tags, identity_status, created_at, updated_at")
    .eq("tenant_id", tenantId)
    .or(orParts.join(","))
    .neq("id", guestId);
  if (error) throw new Error(error.message);

  return (data ?? []).map((g) => ({
    id: g.id as string,
    display_name: g.display_name as string,
    phone: g.phone as string | null,
    email: g.email as string | null,
    tags: parseGuestTags(g.tags),
    identity_status: (g.identity_status as GuestListItem["identity_status"]) ?? "draft",
    profile: null,
    created_at: g.created_at as string,
    updated_at: g.updated_at as string,
    booking_count: 0,
    last_stay_check_out: null,
  }));
});

export async function findDuplicateGuestsForGuest(
  guestId: string
): Promise<GuestListItem[]> {
  return loadDuplicateGuestsForGuest(guestId);
}
