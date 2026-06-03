import { describe, it, expect } from "vitest";
import {
  formatGuestFullName,
  formatGuestGanttLabel,
  guestInitials,
  guestNamesFromForm,
} from "@/domain/guest-name";

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------
function makeFormData(data: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(data)) fd.append(k, v);
  return fd;
}

// ---------------------------------------------------------------------------
// formatGuestFullName
// ---------------------------------------------------------------------------
describe("formatGuestFullName", () => {
  it('returns "Popescu Maria" for normal names', () => {
    expect(formatGuestFullName("Popescu", "Maria")).toBe("Popescu Maria");
  });

  it("trims whitespace from both parts", () => {
    expect(formatGuestFullName("  Popescu  ", "  Maria  ")).toBe("Popescu Maria");
  });

  it("returns just the non-empty name when the other is empty", () => {
    expect(formatGuestFullName("Popescu", "")).toBe("Popescu");
    expect(formatGuestFullName("", "Maria")).toBe("Maria");
  });
});

// ---------------------------------------------------------------------------
// formatGuestGanttLabel
// ---------------------------------------------------------------------------
describe("formatGuestGanttLabel", () => {
  it('returns "Popescu M." when both names are given', () => {
    expect(formatGuestGanttLabel("Popescu", "Maria")).toBe("Popescu M.");
  });

  it('returns "Popescu" when only lastName is given', () => {
    expect(formatGuestGanttLabel("Popescu", null)).toBe("Popescu");
  });

  it('falls back to "Ion P." when given fallbackFullName "Ion Pop"', () => {
    expect(formatGuestGanttLabel(null, null, "Ion Pop")).toBe("Ion P.");
  });

  it('returns "—" when no names and no fallback', () => {
    expect(formatGuestGanttLabel(null, null)).toBe("—");
  });
});

// ---------------------------------------------------------------------------
// guestInitials
// ---------------------------------------------------------------------------
describe("guestInitials", () => {
  it('returns "PM" for Popescu Maria', () => {
    expect(guestInitials("Popescu", "Maria")).toBe("PM");
  });

  it("returns first 2 chars uppercased when only lastName with 2+ chars", () => {
    expect(guestInitials("Popescu", null)).toBe("PO");
  });

  it("returns single char uppercased when lastName is 1 char", () => {
    expect(guestInitials("P", null)).toBe("P");
  });

  it('returns "IP" when fallback is "Ion Pop"', () => {
    expect(guestInitials(null, null, "Ion Pop")).toBe("IP");
  });

  it('returns "?" when no data at all', () => {
    expect(guestInitials(null, null)).toBe("?");
  });
});

// ---------------------------------------------------------------------------
// guestNamesFromForm
// ---------------------------------------------------------------------------
describe("guestNamesFromForm", () => {
  it("returns parsed names for valid form data", () => {
    const fd = makeFormData({
      guest_last_name: "Popescu",
      guest_first_name: "Maria",
    });
    expect(guestNamesFromForm(fd)).toEqual({
      guest_last_name: "Popescu",
      guest_first_name: "Maria",
      guest_name: "Popescu Maria",
    });
  });

  it("throws when last name is missing", () => {
    const fd = makeFormData({ guest_last_name: "", guest_first_name: "Maria" });
    expect(() => guestNamesFromForm(fd)).toThrow(
      "guest.last_and_first_name_required"
    );
  });

  it("throws when first name is missing", () => {
    const fd = makeFormData({ guest_last_name: "Popescu", guest_first_name: "" });
    expect(() => guestNamesFromForm(fd)).toThrow(
      "guest.last_and_first_name_required"
    );
  });
});
