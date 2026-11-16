/** A taken period of one room, as published to other sites. */
export type IcalExportEvent = {
  uid: string;
  checkIn: string;
  checkOut: string;
};

function compactDay(iso: string): string {
  return iso.replace(/-/g, "");
}

function compactStamp(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Lines longer than 75 octets continue on the next line after a space (RFC 5545 §3.1). */
function fold(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const parts: string[] = [];
  let current = "";
  let size = 0;
  for (const ch of line) {
    const chSize = new TextEncoder().encode(ch).length;
    const limit = parts.length === 0 ? 75 : 74;
    if (size + chSize > limit) {
      parts.push(current);
      current = "";
      size = 0;
    }
    current += ch;
    size += chSize;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

/**
 * A room's calendar for other sites to read. It says only that the nights are
 * taken ("summary"), never who stays, since the address can be read by anyone
 * who has it.
 */
export function buildIcalCalendar(args: {
  calendarName: string;
  summary: string;
  events: IcalExportEvent[];
  now?: Date;
}): string {
  const stamp = compactStamp(args.now ?? new Date());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Zalmox//Reception//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(args.calendarName)}`,
  ];
  for (const event of args.events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${escapeText(event.uid)}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${compactDay(event.checkIn)}`,
      `DTEND;VALUE=DATE:${compactDay(event.checkOut)}`,
      `SUMMARY:${escapeText(args.summary)}`,
      "TRANSP:OPAQUE",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
