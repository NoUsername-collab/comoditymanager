import { describe, expect, it } from "vitest";
import { looksLikeIcal, parseIcalEvents } from "@/domain/ical/parse";
import { buildIcalCalendar } from "@/domain/ical/generate";
import { countImportConflicts, planIcalSync } from "@/domain/ical/sync-plan";
import { normalizeIcalFeedUrl, suggestIcalFeedName } from "@/domain/ical/feed-url";

const BOOKING = [
  "BEGIN:VCALENDAR",
  "VERSION:2.0",
  "PRODID:-//admin.booking.com//EN",
  "BEGIN:VEVENT",
  "UID:a1b2c3@booking.com",
  "DTSTART;VALUE=DATE:20261120",
  "DTEND;VALUE=DATE:20261123",
  "SUMMARY:CLOSED - Not available",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "UID:cancelled@booking.com",
  "DTSTART;VALUE=DATE:20261201",
  "DTEND;VALUE=DATE:20261203",
  "STATUS:CANCELLED",
  "END:VEVENT",
  "END:VCALENDAR",
].join("\r\n");

const AIRBNB = [
  "BEGIN:VCALENDAR",
  "BEGIN:VEVENT",
  "DTSTAMP:20261114T100000Z",
  "DTSTART;VALUE=DATE:20261205",
  "DTEND;VALUE=DATE:20261207",
  "SUMMARY:Reserved",
  "UID:1418fb94e984-0b6ee5c3a2e2a6c1a1b7a5b0b0c4f2d3@airbnb.co",
  " m",
  "DESCRIPTION:Reservation URL: https://www.airbnb.com/hosting/reservations/details/HM\\, X",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "DTSTART;TZID=Europe/Bucharest:20261210T150000",
  "SUMMARY:One night\\, no end",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "DTSTART:20261215T120000Z",
  "DURATION:P2D",
  "UID:dur",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "DTSTART;VALUE=DATE:20261220",
  "DTEND;VALUE=DATE:20261220",
  "UID:zero",
  "END:VEVENT",
  "END:VCALENDAR",
].join("\n");

describe("reading another site's calendar", () => {
  it("keeps reservations as nights and leaves cancelled ones out", () => {
    expect(parseIcalEvents(BOOKING)).toEqual([
      {
        uid: "a1b2c3@booking.com",
        checkIn: "2026-11-20",
        checkOut: "2026-11-23",
        summary: "CLOSED - Not available",
      },
    ]);
  });

  it("joins folded lines, reads dates with times, a missing end and a duration", () => {
    const events = parseIcalEvents(AIRBNB);
    expect(events.map((e) => [e.checkIn, e.checkOut])).toEqual([
      ["2026-12-05", "2026-12-07"],
      ["2026-12-10", "2026-12-11"],
      ["2026-12-15", "2026-12-17"],
    ]);
    expect(events[0].uid).toBe("1418fb94e984-0b6ee5c3a2e2a6c1a1b7a5b0b0c4f2d3@airbnb.com");
    expect(events[1].summary).toBe("One night, no end");
    expect(events[1].uid).toBe("2026-12-10/2026-12-11/One night, no end");
  });

  it("tells a calendar from a login page", () => {
    expect(looksLikeIcal(BOOKING)).toBe(true);
    expect(looksLikeIcal("<!doctype html><title>Sign in</title>")).toBe(false);
  });
});

describe("publishing a room's calendar", () => {
  it("writes whole days, no guest names, CRLF lines of at most 75 octets", () => {
    const ics = buildIcalCalendar({
      calendarName: "Casa Test — Camera 101 cu vedere spre munte și balcon mare, etajul întâi",
      summary: "Ocupat",
      events: [{ uid: "seg-1@zalmox", checkIn: "2026-11-20", checkOut: "2026-11-23" }],
      now: new Date("2026-11-14T10:00:00Z"),
    });
    expect(ics).toContain("DTSTART;VALUE=DATE:20261120\r\n");
    expect(ics).toContain("DTEND;VALUE=DATE:20261123\r\n");
    expect(ics).toContain("SUMMARY:Ocupat\r\n");
    expect(ics).toContain("DTSTAMP:20261114T100000Z\r\n");
    for (const line of ics.split("\r\n")) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
    // What we publish, another reader (and ours) reads back the same.
    expect(parseIcalEvents(ics)).toEqual([
      { uid: "seg-1@zalmox", checkIn: "2026-11-20", checkOut: "2026-11-23", summary: "Ocupat" },
    ]);
  });
});

describe("one sync of an imported calendar", () => {
  const today = "2026-11-14";
  const existing = [
    {
      id: "b-past",
      uid: "past",
      checkIn: "2026-11-01",
      checkOut: "2026-11-03",
      reason: "Booking.com",
    },
    {
      id: "b-moved",
      uid: "moved",
      checkIn: "2026-11-20",
      checkOut: "2026-11-22",
      reason: "Booking.com",
    },
    {
      id: "b-same",
      uid: "same",
      checkIn: "2026-12-01",
      checkOut: "2026-12-02",
      reason: "Booking.com",
    },
    {
      id: "b-gone",
      uid: "gone",
      checkIn: "2026-12-10",
      checkOut: "2026-12-12",
      reason: "Booking.com",
    },
  ];
  const events = [
    { uid: "moved", checkIn: "2026-11-21", checkOut: "2026-11-24", summary: "" },
    { uid: "same", checkIn: "2026-12-01", checkOut: "2026-12-02", summary: "" },
    {
      uid: "new",
      checkIn: "2027-01-05",
      checkOut: "2027-01-08",
      summary: "CLOSED - Not available",
    },
    { uid: "old", checkIn: "2026-10-01", checkOut: "2026-10-03", summary: "" },
  ];

  it("adds new reservations, moves changed ones, removes cancelled ones and keeps the past", () => {
    expect(planIcalSync({ feedName: "Booking.com", events, existing, today })).toEqual({
      insert: [
        {
          uid: "new",
          checkIn: "2027-01-05",
          checkOut: "2027-01-08",
          reason: "Booking.com · CLOSED - Not available",
        },
      ],
      update: [
        { id: "b-moved", checkIn: "2026-11-21", checkOut: "2026-11-24", reason: "Booking.com" },
      ],
      remove: ["b-gone"],
    });
  });

  it("counts reservations that overlap nights Zalmox already gave away", () => {
    const taken = [{ checkIn: "2026-11-23", checkOut: "2026-11-25" }];
    expect(countImportConflicts([{ checkIn: "2026-11-21", checkOut: "2026-11-24" }], taken)).toBe(
      1,
    );
    // Departure day is free for the next arrival.
    expect(countImportConflicts([{ checkIn: "2026-11-21", checkOut: "2026-11-23" }], taken)).toBe(
      0,
    );
  });
});

describe("a calendar address the owner pastes", () => {
  it("accepts https and webcal addresses on public names", () => {
    expect(normalizeIcalFeedUrl(" webcal://www.airbnb.com/calendar/ical/1.ics?s=abc ")).toEqual({
      ok: true,
      url: "https://www.airbnb.com/calendar/ical/1.ics?s=abc",
    });
    expect(
      normalizeIcalFeedUrl("https://admin.booking.com/hotel/hoteladmin/ical.html?t=x").ok,
    ).toBe(true);
  });

  it("refuses plain http, the server's own network and addresses with passwords", () => {
    expect(normalizeIcalFeedUrl("http://example.com/a.ics")).toEqual({
      ok: false,
      error: "not_https",
    });
    expect(normalizeIcalFeedUrl("https://localhost/a.ics")).toEqual({
      ok: false,
      error: "private_host",
    });
    expect(normalizeIcalFeedUrl("https://169.254.169.254/latest")).toEqual({
      ok: false,
      error: "private_host",
    });
    expect(normalizeIcalFeedUrl("https://intranet/a.ics")).toEqual({
      ok: false,
      error: "private_host",
    });
    expect(normalizeIcalFeedUrl("https://u:p@example.com/a.ics")).toEqual({
      ok: false,
      error: "invalid_url",
    });
    expect(normalizeIcalFeedUrl("not a url")).toEqual({ ok: false, error: "invalid_url" });
  });

  it("names the feed after the site", () => {
    expect(suggestIcalFeedName("https://admin.booking.com/x.ics")).toBe("Booking.com");
    expect(suggestIcalFeedName("https://www.airbnb.ro/calendar/ical/1.ics")).toBe("Airbnb");
    expect(suggestIcalFeedName("https://www.example.ro/cal.ics")).toBe("example.ro");
  });
});
