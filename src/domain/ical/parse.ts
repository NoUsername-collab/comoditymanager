import { addDays } from "@/lib/stay-dates";

/** One reservation or closed period read from another site's calendar. */
export type IcalEvent = {
  uid: string;
  /** First night, YYYY-MM-DD. */
  checkIn: string;
  /** Morning of departure, YYYY-MM-DD (the night before is the last one). */
  checkOut: string;
  summary: string;
};

/** The most events one calendar may bring in: a room has one stay a night. */
export const ICAL_MAX_EVENTS = 2000;

/** Lines continue on the next one when it starts with a space or a tab (RFC 5545 §3.1). */
function unfold(text: string): string[] {
  return text
    .replace(/\r\n|\r/g, "\n")
    .replace(/\n[ \t]/g, "")
    .split("\n");
}

function unescapeText(value: string): string {
  return value
    .replace(/\\n/gi, " ")
    .replace(/\\([,;\\])/g, "$1")
    .trim();
}

type Property = { name: string; params: Record<string, string>; value: string };

function parseProperty(line: string): Property | null {
  // The value starts at the first colon outside a quoted parameter value.
  let inQuotes = false;
  let colon = -1;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') inQuotes = !inQuotes;
    else if (ch === ":" && !inQuotes) {
      colon = i;
      break;
    }
  }
  if (colon < 0) return null;
  const [rawName, ...rawParams] = line.slice(0, colon).split(";");
  const params: Record<string, string> = {};
  for (const param of rawParams) {
    const eq = param.indexOf("=");
    if (eq > 0) params[param.slice(0, eq).toUpperCase()] = param.slice(eq + 1).replace(/"/g, "");
  }
  return { name: rawName.toUpperCase(), params, value: line.slice(colon + 1) };
}

/** A DATE or DATE-TIME value as the calendar day it names (YYYY-MM-DD). */
function dayOf(value: string): string | null {
  const match = /^(\d{4})(\d{2})(\d{2})/.exec(value.trim());
  if (!match) return null;
  const [, y, m, d] = match;
  const month = Number(m);
  const day = Number(d);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${y}-${m}-${d}`;
}

/** Whole days in a DURATION such as P3D, P1W or P2DT3H (hours are dropped). */
function durationDays(value: string): number | null {
  const match = /^P(?:(\d+)W)?(?:(\d+)D)?/.exec(value.trim());
  if (!match || (!match[1] && !match[2])) return null;
  return Number(match[1] ?? 0) * 7 + Number(match[2] ?? 0);
}

/**
 * The reservations in an iCalendar file (what Booking.com, Airbnb, Vrbo and
 * most channel managers publish). Cancelled events, events without a start and
 * events shorter than a night are left out. An event without an end lasts one
 * night, as the standard says for a DATE start.
 */
export function parseIcalEvents(text: string): IcalEvent[] {
  const events: IcalEvent[] = [];
  let current: Map<string, Property> | null = null;

  for (const line of unfold(text)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const upper = trimmed.toUpperCase();
    if (upper === "BEGIN:VEVENT") {
      current = new Map();
      continue;
    }
    if (upper === "END:VEVENT") {
      if (current) {
        const event = toEvent(current);
        if (event) events.push(event);
        if (events.length >= ICAL_MAX_EVENTS) break;
      }
      current = null;
      continue;
    }
    if (!current) continue;
    const property = parseProperty(trimmed);
    // The first occurrence wins; an event has one start, end and UID.
    if (property && !current.has(property.name)) current.set(property.name, property);
  }
  return events;
}

function toEvent(props: Map<string, Property>): IcalEvent | null {
  if (props.get("STATUS")?.value.trim().toUpperCase() === "CANCELLED") return null;
  const start = props.get("DTSTART");
  const checkIn = start ? dayOf(start.value) : null;
  if (!checkIn) return null;

  let checkOut: string | null = null;
  const end = props.get("DTEND");
  if (end) checkOut = dayOf(end.value);
  if (!checkOut) {
    const duration = props.get("DURATION");
    const days = duration ? durationDays(duration.value) : null;
    checkOut = addDays(checkIn, days && days > 0 ? days : 1);
  }
  if (checkOut <= checkIn) return null;

  const summary = unescapeText(props.get("SUMMARY")?.value ?? "");
  const uid = props.get("UID")?.value.trim() || `${checkIn}/${checkOut}/${summary}`;
  return { uid: uid.slice(0, 500), checkIn, checkOut, summary: summary.slice(0, 200) };
}

/** Whether the text is an iCalendar file at all (an HTML login page is not). */
export function looksLikeIcal(text: string): boolean {
  return /^\s*BEGIN:VCALENDAR/i.test(text);
}
