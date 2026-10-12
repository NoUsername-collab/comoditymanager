/**
 * Gregorian calendar helpers (local Date parsing).
 * ISO YYYY-MM-DD is always parsed in local time, without UTC shift.
 */

export function toIntlLocale(locale: string): string {
  if (locale === "ro") return "ro-RO";
  if (locale === "bg") return "bg-BG";
  return "en-GB";
}

export function parseDateIsoLocal(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

/** Days in month (0-indexed month), including leap February */
export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function formatWeekdayShort(iso: string, locale: string): string {
  const d = parseDateIsoLocal(iso);
  const formatted = new Intl.DateTimeFormat(toIntlLocale(locale), {
    weekday: "short",
  }).format(d);
  return formatted.replace(/\.$/u, "");
}

export function formatWeekdayNarrow(iso: string, locale: string): string {
  const d = parseDateIsoLocal(iso);
  return new Intl.DateTimeFormat(toIntlLocale(locale), {
    weekday: "narrow",
  }).format(d);
}

export function dayInitialFromIso(iso: string, locale = "ro"): string {
  return formatWeekdayShort(iso, locale);
}

function resolveLocaleAndShowYear(
  localeOrShowYear?: string | boolean,
  showYearArg?: boolean
): { locale: string; showYear: boolean } {
  if (typeof localeOrShowYear === "string") {
    return { locale: localeOrShowYear, showYear: showYearArg ?? false };
  }
  if (typeof localeOrShowYear === "boolean") {
    return { locale: "ro", showYear: localeOrShowYear };
  }
  return { locale: "ro", showYear: showYearArg ?? false };
}

/** e.g. "22 May · Thu" (locale-dependent) */
export function formatDateWithDay(
  iso: string,
  localeOrShowYear?: string | boolean,
  showYearArg?: boolean
): string {
  const { locale, showYear } = resolveLocaleAndShowYear(
    localeOrShowYear,
    showYearArg
  );
  const d = parseDateIsoLocal(iso);
  const loc = toIntlLocale(locale);
  const datePart = new Intl.DateTimeFormat(loc, {
    day: "numeric",
    month: "short",
    ...(showYear ? { year: "numeric" } : {}),
  }).format(d);
  const weekday = formatWeekdayShort(iso, locale);
  return `${datePart} · ${weekday}`;
}

export function formatStayPeriod(
  checkIn: string,
  checkOut: string,
  localeOrShowYear?: string | boolean,
  showYearArg?: boolean
): string {
  const { locale, showYear } = resolveLocaleAndShowYear(
    localeOrShowYear,
    showYearArg
  );
  return `${formatDateWithDay(checkIn, locale, showYear)} → ${formatDateWithDay(checkOut, locale, showYear)}`;
}

export function monthYearLabel(
  year: number,
  month: number,
  locale: string
): string {
  return new Date(year, month, 1).toLocaleDateString(toIntlLocale(locale), {
    month: "long",
    year: "numeric",
  });
}
