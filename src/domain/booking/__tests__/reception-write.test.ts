import { describe, expect, it } from "vitest";
import { RECEPTION_OCCUPANCY_KINDS } from "@/domain/booking/reception-write";

describe("reception write occupancy", () => {
  it("blocks over holds and blocks, not only confirmed stays", () => {
    expect(RECEPTION_OCCUPANCY_KINDS).toEqual([
      "hold",
      "request",
      "stay",
      "block",
    ]);
  });
});
