import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/platform/branding", () => ({
  platformPoweredByLabel: () => "Powered by Zalmox",
}));

import {
  newBookingRequestToOwner,
  bookingConfirmedToGuest,
  bookingCancelledToGuest,
  dailySummaryToOwner,
} from "@/lib/email/templates";

// ---------------------------------------------------------------------------
// newBookingRequestToOwner
// ---------------------------------------------------------------------------
describe("newBookingRequestToOwner", () => {
  const data = {
    pensionName: "Casa Emil",
    guestName: "Ion Popescu",
    guestEmail: "ion@example.com",
    guestPhone: "+40712345678",
    checkIn: "2025-06-10",
    checkOut: "2025-06-12",
    adults: 2,
    children: 1,
    rooms: ["Camera 1", "Camera 2"],
    adminUrl: "https://admin.example.com/bookings/1",
  };

  it("returns subject, html, and text", () => {
    const result = newBookingRequestToOwner(data);
    expect(result).toHaveProperty("subject");
    expect(result).toHaveProperty("html");
    expect(result).toHaveProperty("text");
  });

  it("subject contains guest name and dates", () => {
    const result = newBookingRequestToOwner(data);
    expect(result.subject).toContain("Ion Popescu");
    expect(result.subject).toContain("2025-06-10");
    expect(result.subject).toContain("2025-06-12");
  });

  it("HTML contains guest name, check-in, and check-out", () => {
    const result = newBookingRequestToOwner(data);
    expect(result.html).toContain("Ion Popescu");
    expect(result.html).toContain("2025-06-10");
    expect(result.html).toContain("2025-06-12");
  });

  it("text contains key information", () => {
    const result = newBookingRequestToOwner(data);
    expect(result.text).toContain("Ion Popescu");
    expect(result.text).toContain("2025-06-10");
  });

  it("includes phone when provided", () => {
    const result = newBookingRequestToOwner(data);
    expect(result.html).toContain("+40712345678");
  });

  it("handles null phone gracefully", () => {
    const result = newBookingRequestToOwner({ ...data, guestPhone: null });
    expect(result.html).not.toContain("null");
  });
});

// ---------------------------------------------------------------------------
// bookingConfirmedToGuest
// ---------------------------------------------------------------------------
describe("bookingConfirmedToGuest", () => {
  const data = {
    pensionName: "Casa Emil",
    guestName: "Maria Ionescu",
    checkIn: "2025-07-01",
    checkOut: "2025-07-03",
    rooms: ["Suite A"],
    totalPrice: 800,
    currency: "RON",
    checkInTime: "14:00",
    checkOutTime: "11:00",
    pensionPhone: "+40700111222",
    pensionEmail: "contact@casaemil.ro",
  };

  it("returns subject, html, and text", () => {
    const result = bookingConfirmedToGuest(data);
    expect(result).toHaveProperty("subject");
    expect(result).toHaveProperty("html");
    expect(result).toHaveProperty("text");
  });

  it("subject contains pension name and check-in date", () => {
    const result = bookingConfirmedToGuest(data);
    expect(result.subject).toContain("Casa Emil");
    expect(result.subject).toContain("2025-07-01");
  });

  it("HTML includes guest name, rooms, and price", () => {
    const result = bookingConfirmedToGuest(data);
    expect(result.html).toContain("Maria Ionescu");
    expect(result.html).toContain("Suite A");
    expect(result.html).toContain("800");
    expect(result.html).toContain("RON");
  });

  it("text includes key booking details", () => {
    const result = bookingConfirmedToGuest(data);
    expect(result.text).toContain("Maria Ionescu");
    expect(result.text).toContain("2025-07-01");
    expect(result.text).toContain("800");
  });

  it("handles optional pensionPhone and pensionEmail", () => {
    const result = bookingConfirmedToGuest({
      ...data,
      pensionPhone: undefined,
      pensionEmail: undefined,
    });
    // Should still render without errors
    expect(result.html).toContain("Maria Ionescu");
  });
});

// ---------------------------------------------------------------------------
// bookingCancelledToGuest
// ---------------------------------------------------------------------------
describe("bookingCancelledToGuest", () => {
  const data = {
    pensionName: "Casa Emil",
    guestName: "Ana Vasilescu",
    checkIn: "2025-08-01",
    checkOut: "2025-08-05",
  };

  it("returns subject, html, and text", () => {
    const result = bookingCancelledToGuest(data);
    expect(result).toHaveProperty("subject");
    expect(result).toHaveProperty("html");
    expect(result).toHaveProperty("text");
  });

  it("subject contains pension name and check-in", () => {
    const result = bookingCancelledToGuest(data);
    expect(result.subject).toContain("Casa Emil");
    expect(result.subject).toContain("2025-08-01");
  });

  it("HTML contains guest name and dates", () => {
    const result = bookingCancelledToGuest(data);
    expect(result.html).toContain("Ana Vasilescu");
    expect(result.html).toContain("2025-08-01");
    expect(result.html).toContain("2025-08-05");
  });

  it("includes reason when provided", () => {
    const result = bookingCancelledToGuest({ ...data, reason: "Camera indisponibila" });
    expect(result.html).toContain("Camera indisponibila");
    expect(result.text).toContain("Camera indisponibila");
  });

  it("handles missing reason gracefully", () => {
    const result = bookingCancelledToGuest(data);
    // No "Motiv" label should appear in the text when no reason
    expect(result.text).not.toContain("Motiv:");
  });

  it("escapes HTML in guest-provided fields", () => {
    const result = bookingCancelledToGuest({
      ...data,
      guestName: '<img src=x onerror="alert(1)">',
      reason: "<script>evil</script>",
    });
    expect(result.html).not.toContain("<script>");
    expect(result.html).toContain("&lt;script&gt;evil&lt;/script&gt;");
    expect(result.html).not.toContain('onerror="alert(1)"');
  });
});

// ---------------------------------------------------------------------------
// dailySummaryToOwner
// ---------------------------------------------------------------------------
describe("dailySummaryToOwner", () => {
  const data = {
    pensionName: "Casa Emil",
    date: "2025-06-15",
    checkInsToday: [
      { guestName: "Ion Popescu", rooms: ["Camera 1"] },
    ],
    checkOutsToday: [
      { guestName: "Maria Ionescu", rooms: ["Camera 2", "Camera 3"] },
    ],
    pendingRequests: 3,
    occupancyPercent: 75,
  };

  it("returns subject, html, and text", () => {
    const result = dailySummaryToOwner(data);
    expect(result).toHaveProperty("subject");
    expect(result).toHaveProperty("html");
    expect(result).toHaveProperty("text");
  });

  it("subject contains the date and pension name", () => {
    const result = dailySummaryToOwner(data);
    expect(result.subject).toContain("2025-06-15");
    expect(result.subject).toContain("Casa Emil");
  });

  it("HTML contains occupancy, pending requests, and guest names", () => {
    const result = dailySummaryToOwner(data);
    expect(result.html).toContain("75%");
    expect(result.html).toContain("3");
    expect(result.html).toContain("Ion Popescu");
    expect(result.html).toContain("Maria Ionescu");
  });

  it("text contains summary numbers", () => {
    const result = dailySummaryToOwner(data);
    expect(result.text).toContain("75%");
    expect(result.text).toContain("3");
  });

  it("handles empty check-ins and check-outs", () => {
    const result = dailySummaryToOwner({
      ...data,
      checkInsToday: [],
      checkOutsToday: [],
    });
    expect(result.html).toContain("0"); // Check-in count
  });
});
