import type { PublicChromeConfig, PublicPlace, PublicStayOffer } from "./types";

export function emptyPublicPlace(): PublicPlace {
  return { address: null, lat: null, lng: null };
}

type CatalogType = {
  id: string;
  name: string;
  capacity_base: number;
  base_price_per_night: number;
  sort_order: number;
  is_active?: boolean;
};

type CatalogRoom = {
  room_type_definition_id: string | null;
  is_active?: boolean;
  sort_order?: number;
};

export function buildPublicStayOffers(
  types: CatalogType[],
  rooms: CatalogRoom[],
): PublicStayOffer[] {
  const counts = new Map<string, number>();
  for (const room of rooms) {
    if (room.is_active === false) continue;
    const typeId = room.room_type_definition_id?.trim();
    if (!typeId) continue;
    counts.set(typeId, (counts.get(typeId) ?? 0) + 1);
  }

  return types
    .filter((type) => type.is_active !== false)
    .map((type) => ({
      id: type.id,
      name: type.name.trim(),
      capacity: type.capacity_base,
      fromPrice: type.base_price_per_night > 0 ? type.base_price_per_night : null,
      roomCount: counts.get(type.id) ?? 0,
      sortOrder: type.sort_order,
    }))
    .filter((offer) => offer.roomCount > 0 && offer.name)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(({ sortOrder: _sortOrder, ...offer }) => offer);
}

export function formatStayFromPrice(amount: number, locale: string): string {
  const tag = locale === "bg" ? "bg-BG" : locale === "en" ? "en-GB" : "ro-RO";
  try {
    return new Intl.NumberFormat(tag, { maximumFractionDigits: 0 }).format(amount);
  } catch {
    return String(Math.round(amount));
  }
}

export function publicMapHref(place: PublicPlace): string | null {
  if (place.lat != null && place.lng != null && Number.isFinite(place.lat) && Number.isFinite(place.lng)) {
    return `https://www.openstreetmap.org/?mlat=${place.lat}&mlon=${place.lng}#map=16/${place.lat}/${place.lng}`;
  }
  const address = place.address?.trim();
  if (address) {
    return `https://www.openstreetmap.org/search?query=${encodeURIComponent(address)}`;
  }
  return null;
}

export function publicMapEmbedSrc(place: PublicPlace): string | null {
  if (place.lat == null || place.lng == null) return null;
  if (!Number.isFinite(place.lat) || !Number.isFinite(place.lng)) return null;
  const pad = 0.02;
  const { lat, lng } = place;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - pad}%2C${lat - pad}%2C${lng + pad}%2C${lat + pad}&layer=mapnik&marker=${lat}%2C${lng}`;
}

export function shouldShowStayOffers(
  chrome: PublicChromeConfig | undefined,
  offers: PublicStayOffer[],
): boolean {
  return chrome?.showStayOffers !== false && offers.length > 0;
}

export function shouldShowPlace(
  chrome: PublicChromeConfig | undefined,
  place: PublicPlace | undefined,
): boolean {
  if (chrome?.showPlace === false || !place) return false;
  return Boolean(place.address?.trim()) || (place.lat != null && place.lng != null);
}

export function lodgingBusinessJsonLd(args: {
  displayName: string;
  locale: string;
  image?: string | null;
  email?: string | null;
  phone?: string | null;
  checkInTime: string;
  checkOutTime: string;
  place: PublicPlace;
}): Record<string, unknown> {
  const json: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    name: args.displayName,
    checkinTime: args.checkInTime,
    checkoutTime: args.checkOutTime,
    inLanguage: args.locale,
  };
  if (args.image) json.image = args.image;
  if (args.email) json.email = args.email;
  if (args.phone) json.telephone = args.phone;
  if (args.place.address?.trim()) {
    json.address = {
      "@type": "PostalAddress",
      streetAddress: args.place.address.trim(),
    };
  }
  if (args.place.lat != null && args.place.lng != null) {
    json.geo = {
      "@type": "GeoCoordinates",
      latitude: args.place.lat,
      longitude: args.place.lng,
    };
  }
  return json;
}
