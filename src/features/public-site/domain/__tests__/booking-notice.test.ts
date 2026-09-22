import { describe, expect, it } from "vitest";
import {
  alignNoticeDraft,
  buildBookingNoticeView,
  bookingNoticeFromDraft,
  defaultBookingNotice,
  interpolateNoticePlaceholders,
  mergeBookingNoticeFromLocales,
  normalizeBookingNotice,
} from "@/features/public-site/domain/booking-notice";

const presets = {
  noPay: { title: "No pay", text: "Estimate only." },
  hold: { title: "Hold", text: "Rooms held briefly." },
  hours: { title: "Hours", text: "Check-in {checkIn} · Check-out {checkOut}" },
  confirm: { title: "Confirm", text: "We confirm." },
};

describe("normalizeBookingNotice", () => {
  it("falls back to platform presets when storage is empty", () => {
    const notice = normalizeBookingNotice(undefined);
    expect(notice.enabled).toBe(true);
    expect(notice.items.map((item) => item.preset)).toEqual([
      "noPay",
      "hold",
      "hours",
    ]);
  });

  it("keeps an explicit empty list so the owner can hide every item", () => {
    const notice = normalizeBookingNotice({
      enabled: true,
      title: {},
      items: [],
      footer: {},
    });
    expect(notice.items).toEqual([]);
  });
});

describe("buildBookingNoticeView", () => {
  it("keeps highlight copy from presets and interpolates hours", () => {
    const view = buildBookingNoticeView({
      notice: defaultBookingNotice(),
      locale: "en",
      checkInTime: "14:00",
      checkOutTime: "11:00",
      fallbackTitle: "Good to know",
      fallbackFooter: "Final confirm at the desk.",
      presets,
    });

    expect(view.enabled).toBe(true);
    expect(view.title).toBe("Good to know");
    expect(view.items).toHaveLength(3);
    expect(view.items[2]?.text).toBe("Check-in 14:00 · Check-out 11:00");
    expect(view.footer).toBe("Final confirm at the desk.");
  });

  it("uses custom item text when provided", () => {
    const view = buildBookingNoticeView({
      notice: {
        enabled: true,
        title: { en: "Please note" },
        footer: { en: "" },
        items: [
          {
            id: "pets",
            preset: "custom",
            icon: "info",
            title: { en: "Pets" },
            text: { en: "On request." },
          },
        ],
      },
      locale: "en",
      checkInTime: "15:00",
      checkOutTime: "10:00",
      fallbackTitle: "Good to know",
      fallbackFooter: "Footer",
      presets,
    });

    expect(view.title).toBe("Please note");
    expect(view.items).toEqual([
      { id: "pets", icon: "ℹ", title: "Pets", text: "On request." },
    ]);
  });

  it("resolves a generic extra preset from platform copy", () => {
    const view = buildBookingNoticeView({
      notice: {
        enabled: true,
        title: {},
        footer: {},
        items: [
          {
            id: "pets",
            preset: "pets",
            icon: "paw",
            title: {},
            text: {},
          },
        ],
      },
      locale: "en",
      checkInTime: "14:00",
      checkOutTime: "11:00",
      fallbackTitle: "Good to know",
      fallbackFooter: "Footer",
      presets: {
        pets: { title: "Pets", text: "Mention them in the request." },
      },
    });

    expect(view.items).toEqual([
      { id: "pets", icon: "🐾", title: "Pets", text: "Mention them in the request." },
    ]);
  });

  it("keeps platform copy when draft fields are left empty", () => {
    const notice = bookingNoticeFromDraft({
      enabled: true,
      title: "",
      footer: "",
      items: [
        { id: "noPay", preset: "noPay", icon: "check", title: "", text: "" },
      ],
    });
    const view = buildBookingNoticeView({
      notice,
      locale: "en",
      checkInTime: "14:00",
      checkOutTime: "11:00",
      fallbackTitle: "Good to know",
      fallbackFooter: "Final confirm at the desk.",
      presets,
    });
    expect(view.items).toEqual([
      { id: "noPay", icon: "✓", title: "No pay", text: "Estimate only." },
    ]);
  });
});

describe("mergeBookingNoticeFromLocales", () => {
  it("keeps distinct copy per language", () => {
    const item = {
      id: "noPay",
      preset: "noPay" as const,
      icon: "check" as const,
      title: "",
      text: "",
    };
    const notice = mergeBookingNoticeFromLocales(
      defaultBookingNotice(),
      {
        ro: {
          enabled: true,
          title: "RO know",
          footer: "",
          items: [{ ...item, title: "RO pay" }],
        },
        en: {
          enabled: true,
          title: "Good to know",
          footer: "",
          items: [{ ...item, title: "No online payment" }],
        },
        bg: {
          enabled: true,
          title: "",
          footer: "",
          items: [item],
        },
      },
      "en",
    );
    expect(notice.title).toEqual({ ro: "RO know", en: "Good to know" });
    expect(notice.items[0]?.title).toEqual({
      ro: "RO pay",
      en: "No online payment",
    });
  });
});

describe("alignNoticeDraft", () => {
  it("copies structure from the source locale and keeps target text", () => {
    const aligned = alignNoticeDraft(
      {
        enabled: false,
        title: "RO title",
        footer: "",
        items: [
          { id: "noPay", preset: "noPay", icon: "check", title: "RO pay", text: "" },
        ],
      },
      {
        enabled: true,
        title: "EN title",
        footer: "",
        items: [
          { id: "noPay", preset: "noPay", icon: "check", title: "No pay", text: "" },
          { id: "pets", preset: "pets", icon: "paw", title: "Pets", text: "" },
        ],
      },
    );
    expect(aligned.enabled).toBe(true);
    expect(aligned.title).toBe("RO title");
    expect(aligned.items.map((item) => item.id)).toEqual(["noPay", "pets"]);
    expect(aligned.items[0]?.title).toBe("RO pay");
    expect(aligned.items[1]?.title).toBe("");
  });
});

describe("interpolateNoticePlaceholders", () => {
  it("replaces check-in and check-out tokens", () => {
    expect(
      interpolateNoticePlaceholders("In {checkIn} out {checkOut}", "14:00", "11:00")
    ).toBe("In 14:00 out 11:00");
  });
});
