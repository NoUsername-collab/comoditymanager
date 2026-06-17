import { describe, expect, it } from "vitest";
import { resolveInvoiceSeason } from "../invoice-season";

describe("resolveInvoiceSeason", () => {
  it("maps check-in month to meteorological season", () => {
    expect(resolveInvoiceSeason("2026-03-01")).toBe("spring");
    expect(resolveInvoiceSeason("2026-05-31")).toBe("spring");
    expect(resolveInvoiceSeason("2026-06-01")).toBe("summer");
    expect(resolveInvoiceSeason("2026-08-31")).toBe("summer");
    expect(resolveInvoiceSeason("2026-09-01")).toBe("autumn");
    expect(resolveInvoiceSeason("2026-11-30")).toBe("autumn");
    expect(resolveInvoiceSeason("2026-12-01")).toBe("winter");
    expect(resolveInvoiceSeason("2026-02-28")).toBe("winter");
  });
});
