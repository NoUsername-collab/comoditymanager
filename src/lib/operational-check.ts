/** Converts datetime-local/ISO input to ISO timestamp. */
export function parseOperationalTimestamp(input?: string | null): string {
  const raw = input?.trim();
  if (!raw) return new Date().toISOString();

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("operational.invalid_date_or_time");
  }
  return parsed.toISOString();
}

/** Initial value for <input type="datetime-local" /> in local time. */
export function datetimeLocalNow(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function isoToDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return datetimeLocalNow();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatOperationalTimestamp(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("ro-RO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
