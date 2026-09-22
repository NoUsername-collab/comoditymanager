import { describe, expect, it } from "vitest";
import {
  buildPublicStayOffers,
  lodgingBusinessJsonLd,
  publicMapEmbedSrc,
  publicMapHref,
  shouldShowPlace,
  shouldShowStayOffers,
} from "@/features/public-site/domain/stay-offers";

describe("buildPublicStayOffers", () => {
  it("keeps catalog order and skips types with no active rooms", () => {
    const offers = buildPublicStayOffers(
      [
        {
          id: "double",
          name: "Double",
          capacity_base: 2,
          base_price_per_night: 250,
          sort_order: 10,
          is_active: true,
        },
        {
          id: "empty",
          name: "Unused",
          capacity_base: 4,
          base_price_per_night: 400,
          sort_order: 5,
          is_active: true,
        },
        {
          id: "family",
          name: "Family",
          capacity_base: 4,
          base_price_per_night: 0,
          sort_order: 20,
          is_active: true,
        },
      ],
      [
        { room_type_definition_id: "family", is_active: true },
        { room_type_definition_id: "double", is_active: true },
        { room_type_definition_id: "double", is_active: true },
        { room_type_definition_id: "empty", is_active: false },
      ],
    );

    expect(offers.map((row) => row.id)).toEqual(["double", "family"]);
    expect(offers[0]).toMatchObject({ roomCount: 2, fromPrice: 250, capacity: 2 });
    expect(offers[1]?.fromPrice).toBeNull();
  });
});

describe("place helpers", () => {
  it("builds map links only from finite coordinates or an address", () => {
    expect(publicMapHref({ address: null, lat: 47.9, lng: 23.8 })).toContain("mlat=47.9");
    expect(publicMapEmbedSrc({ address: null, lat: 47.9, lng: 23.8 })).toContain("marker=47.9");
    expect(publicMapHref({ address: "Strada 1, Cluj", lat: null, lng: null })).toContain(
      "search?query=",
    );
    expect(publicMapEmbedSrc({ address: "Strada 1", lat: null, lng: null })).toBeNull();
    expect(shouldShowPlace({ showPlace: true }, { address: "X", lat: null, lng: null })).toBe(true);
    expect(shouldShowPlace({ showPlace: false }, { address: "X", lat: null, lng: null })).toBe(
      false,
    );
  });
});

describe("shouldShowStayOffers", () => {
  it("hides when the catalog is empty", () => {
    expect(shouldShowStayOffers({ showStayOffers: true }, [])).toBe(false);
  });
});

describe("lodgingBusinessJsonLd", () => {
  it("emits LodgingBusiness with geo when coordinates exist", () => {
    const json = lodgingBusinessJsonLd({
      displayName: "Casa Test",
      locale: "ro",
      image: "https://cdn.example/hero.jpg",
      email: "a@b.ro",
      phone: "+40",
      checkInTime: "14:00",
      checkOutTime: "11:00",
      place: { address: "Strada 1", lat: 47.9, lng: 23.8 },
    });
    expect(json["@type"]).toBe("LodgingBusiness");
    expect(json.geo).toEqual({
      "@type": "GeoCoordinates",
      latitude: 47.9,
      longitude: 23.8,
    });
  });
});
