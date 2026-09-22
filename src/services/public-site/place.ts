import { createPublicAdminClient } from "@/lib/supabase/admin";
import { emptyPublicPlace } from "@/features/public-site/domain/stay-offers";
import type { PublicPlace } from "@/features/public-site/domain/types";

function asCoord(raw: unknown): number | null {
  const n = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(n) ? n : null;
}

export async function loadPublicPlace(tenantId: string): Promise<PublicPlace> {
  try {
    const supabase = createPublicAdminClient();
    const { data, error } = await supabase
      .from("pension_settings")
      .select("fisa_property_address, weather_lat, weather_lng")
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (error || !data) return emptyPublicPlace();
    const address =
      typeof data.fisa_property_address === "string"
        ? data.fisa_property_address.trim() || null
        : null;
    return {
      address,
      lat: asCoord(data.weather_lat),
      lng: asCoord(data.weather_lng),
    };
  } catch {
    return emptyPublicPlace();
  }
}
