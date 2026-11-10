import { describe, expect, it } from "vitest";
import { mapPoint, parseMapPoint } from "@/domain/settings/map-point";

describe("map point", () => {
  it("reads plain coordinates", () => {
    expect(parseMapPoint("45.272, 24.361")).toEqual({ lat: 45.272, lng: 24.361 });
    expect(parseMapPoint(" 44.4268,26.1025 ")).toEqual({ lat: 44.4268, lng: 26.1025 });
  });

  it("reads Google Maps links, the pin before the view", () => {
    expect(parseMapPoint("https://www.google.com/maps/place/Casa/@45.27,24.36,15z/data=!3d45.2711!4d24.3622")).toEqual({
      lat: 45.2711,
      lng: 24.3622,
    });
    expect(parseMapPoint("https://www.google.com/maps/@45.27,24.36,15z")).toEqual({ lat: 45.27, lng: 24.36 });
    expect(parseMapPoint("https://maps.google.com/?q=45.27%2C24.36")).toEqual({ lat: 45.27, lng: 24.36 });
  });

  it("reads OpenStreetMap links", () => {
    expect(parseMapPoint("https://www.openstreetmap.org/?mlat=45.1&mlon=24.2#map=16/45.1/24.2")).toEqual({ lat: 45.1, lng: 24.2 });
    expect(parseMapPoint("https://www.openstreetmap.org/#map=16/46.5/23.9")).toEqual({ lat: 46.5, lng: 23.9 });
  });

  it("refuses what is not a place", () => {
    expect(parseMapPoint("Str. Principala 1")).toBeNull();
    expect(parseMapPoint("95, 24")).toBeNull();
    expect(parseMapPoint("0, 0")).toBeNull();
    expect(parseMapPoint("https://maps.app.goo.gl/abc123")).toBeNull();
    expect(mapPoint(null, null)).toBeNull();
    expect(mapPoint("45.5", "24.1")).toEqual({ lat: 45.5, lng: 24.1 });
  });
});
