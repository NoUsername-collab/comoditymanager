import { describe, it, expect } from "vitest";
import { buildInformalInvoice, formatRon } from "@/domain/invoice/informal-invoice";

function makeInput(overrides: Record<string, unknown> = {}) {
  return {
    booking_id: "bk-1",
    guest_name: "Ion Popescu",
    guest_email: "ion@example.com",
    guest_phone: "+40712345678",
    check_in: "2025-06-10",
    check_out: "2025-06-12",
    total_price: null as number | null,
    rooms: [
      {
        room_id: "r1",
        room_name: "Camera 1",
        building_name: "Vila A",
        price_per_night: 200,
      },
    ],
    ...overrides,
  };
}

describe("buildInformalInvoice", () => {
  it("calculates nights and line_total for a single room", () => {
    const result = buildInformalInvoice(makeInput());
    // 2 nights * 200 = 400
    expect(result.nights).toBe(2);
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0].line_total).toBe(400);
    expect(result.subtotal).toBe(400);
  });

  it("calculates subtotal as sum of line totals for multiple rooms", () => {
    const result = buildInformalInvoice(
      makeInput({
        rooms: [
          { room_id: "r1", room_name: "Camera 1", building_name: "Vila A", price_per_night: 200 },
          { room_id: "r2", room_name: "Camera 2", building_name: "Vila B", price_per_night: 150 },
        ],
      })
    );
    // 2 nights: (200 + 150) * 2 = 700
    expect(result.lines).toHaveLength(2);
    expect(result.lines[0].line_total).toBe(400);
    expect(result.lines[1].line_total).toBe(300);
    expect(result.subtotal).toBe(700);
  });

  it("uses recorded total when total_price is provided and > 0", () => {
    const result = buildInformalInvoice(makeInput({ total_price: 500 }));
    expect(result.uses_recorded_total).toBe(true);
    expect(result.total_price).toBe(500);
  });

  it("falls back to subtotal when total_price is null", () => {
    const result = buildInformalInvoice(makeInput({ total_price: null }));
    expect(result.uses_recorded_total).toBe(false);
    expect(result.total_price).toBe(result.subtotal);
  });

  it("falls back to subtotal when total_price is 0", () => {
    const result = buildInformalInvoice(makeInput({ total_price: 0 }));
    expect(result.uses_recorded_total).toBe(false);
    expect(result.total_price).toBe(result.subtotal);
  });

  it("includes a disclaimer string", () => {
    const result = buildInformalInvoice(makeInput());
    expect(result.disclaimer).toBeTruthy();
    expect(typeof result.disclaimer).toBe("string");
    expect(result.disclaimer.length).toBeGreaterThan(0);
  });

  it("preserves guest_phone when null", () => {
    const result = buildInformalInvoice(makeInput({ guest_phone: null }));
    expect(result.guest_phone).toBeNull();
  });

  it("preserves guest info fields", () => {
    const result = buildInformalInvoice(makeInput());
    expect(result.booking_id).toBe("bk-1");
    expect(result.guest_name).toBe("Ion Popescu");
    expect(result.guest_email).toBe("ion@example.com");
    expect(result.guest_phone).toBe("+40712345678");
    expect(result.check_in).toBe("2025-06-10");
    expect(result.check_out).toBe("2025-06-12");
  });
});

describe("formatRon", () => {
  it("formats a whole number", () => {
    const result = formatRon(100);
    expect(result).toContain("100");
    expect(result.toLowerCase()).toContain("ron");
  });

  it("formats a decimal number", () => {
    const result = formatRon(99.5);
    expect(result).toContain("99");
    expect(result).toMatch(/99[,.]5/);
  });

  it("formats zero", () => {
    const result = formatRon(0);
    expect(result).toContain("0");
    expect(result.toLowerCase()).toContain("ron");
  });
});
