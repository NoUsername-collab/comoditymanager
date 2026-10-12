import { describe, expect, it } from "vitest";
import { buildPricingExample } from "@/domain/settings/booking-rules";

describe("buildPricingExample", () => {
  it("multiplies weekend and season like nightly rates", () => {
    const example = buildPricingExample({
      pricingWeekendEnabled: true,
      pricingWeekendMultiplier: 1.2,
      pricingSeasons: [
        { id: "s", name: "Vară", startMonth: 6, startDay: 1, endMonth: 8, endDay: 31, multiplier: 1.5 },
      ],
    });
    expect(example.weekend).toBe(240);
    expect(example.seasons).toEqual([{ name: "Vară", weekday: 300, weekend: 360 }]);
  });

  it("leaves weekend prices out when the surcharge is off", () => {
    const example = buildPricingExample({
      pricingWeekendEnabled: false,
      pricingWeekendMultiplier: 1.2,
      pricingSeasons: [],
    });
    expect(example).toEqual({ base: 200, weekend: null, seasons: [] });
  });
});
