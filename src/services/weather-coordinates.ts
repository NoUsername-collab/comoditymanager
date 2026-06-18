import { createPublicAdminClient } from "@/lib/supabase/admin";
import { resolveTenantIdForData } from "@/lib/tenant/resolve-id";

export type WeatherCoordinates = {
  lat: number;
  lng: number;
} | null;

export async function getWeatherCoordinates(): Promise<WeatherCoordinates> {
  try {
    const tenantId = await resolveTenantIdForData();
    if (!tenantId) return null;
    const supabase = createPublicAdminClient();
    const { data } = await supabase
      .from("pension_settings")
      .select("weather_lat, weather_lng")
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (!data?.weather_lat || !data?.weather_lng) return null;
    return { lat: data.weather_lat, lng: data.weather_lng };
  } catch {
    return null;
  }
}
