/** A point on the map: the property's location, for the site's map and the weather. */
export type MapPoint = { lat: number; lng: number };

function valid(lat: number, lng: number): MapPoint | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  // 0,0 is in the ocean: it is what an empty value looks like, never a guesthouse.
  if (lat === 0 && lng === 0) return null;
  return { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) };
}

export function mapPoint(lat: unknown, lng: unknown): MapPoint | null {
  const num = (v: unknown) =>
    typeof v === "number" ? v : typeof v === "string" && v.trim() ? Number(v) : NaN;
  return valid(num(lat), num(lng));
}

const PAIR = /(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)/;

/**
 * Coordinates from what an operator can paste: "45.27, 24.36", a Google Maps
 * link (…/@45.27,24.36,15z or …!3d45.27!4d24.36 or ?q=45.27,24.36) or an
 * OpenStreetMap link (?mlat=…&mlon=… or #map=16/45.27/24.36). Null otherwise.
 */
export function parseMapPoint(raw: string): MapPoint | null {
  const text = raw.trim();
  if (!text) return null;

  const pin = /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/.exec(text);
  if (pin) return valid(Number(pin[1]), Number(pin[2]));

  const at = /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/.exec(text);
  if (at) return valid(Number(at[1]), Number(at[2]));

  const osm = /[?&]mlat=(-?\d+(?:\.\d+)?)&mlon=(-?\d+(?:\.\d+)?)/.exec(text);
  if (osm) return valid(Number(osm[1]), Number(osm[2]));

  const osmHash = /#map=\d+\/(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)/.exec(text);
  if (osmHash) return valid(Number(osmHash[1]), Number(osmHash[2]));

  let decoded = text;
  try {
    decoded = decodeURIComponent(text);
  } catch {
    // keep the raw text
  }
  const pair = PAIR.exec(decoded);
  if (pair) return valid(Number(pair[1]), Number(pair[2]));
  return null;
}
