import { mapPoint, type MapPoint } from "@/domain/settings/map-point";
import { geocodeQueries } from "@/domain/settings/geocode-queries";
import { platformSiteUrl } from "@/lib/platform/branding";

export type GeocodeResult = MapPoint & {
  label: string;
  /** Only the locality was found, not the street: the operator should check the pin. */
  approximate: boolean;
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function search(query: string): Promise<(MapPoint & { label: string }) | null> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "ro,md,bg");
  url.searchParams.set("q", query);
  const res = await fetch(url, {
    headers: {
      "User-Agent": `Zalmox/1.0 (+${platformSiteUrl()})`,
      "Accept-Language": "ro,en",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`geocode.http_${res.status}`);
  const rows = (await res.json()) as { lat?: string; lon?: string; display_name?: string }[];
  const first = rows[0];
  if (!first) return null;
  const point = mapPoint(first.lat, first.lon);
  return point ? { ...point, label: String(first.display_name ?? "") } : null;
}

/**
 * The map point of an address, from OpenStreetMap's Nominatim: the whole
 * address first, then simpler forms, then the locality alone. Called only when
 * an operator asks in the settings; tries are spaced over a second apart, as
 * Nominatim's policy asks, and the request names the app.
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  const queries = geocodeQueries(address);
  for (const [index, q] of queries.entries()) {
    if (index > 0) await wait(1100);
    const found = await search(q.query);
    if (found) return { ...found, approximate: q.approximate };
  }
  return null;
}
